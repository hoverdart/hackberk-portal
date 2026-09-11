"use client";

import { Check, ChevronLeft, ChevronRight, Cloud, CloudOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveApplicationSectionAction,
  submitApplicationAction,
  withdrawApplicationAction,
} from "@/app/(portal)/applications/actions";
import type { FieldDefinition, SectionDefinition } from "@/lib/applications/definitions";
import type { ApplicationRole, ApplicationStatus } from "@/lib/domain/applications";
import { initialApplicationState } from "@/lib/validation/applications";

/**
 * The multi-step application wizard.
 *
 * A Client Component because the step navigation and the autosave timer are
 * genuinely interactive. Everything that touches data still runs in Server
 * Actions — this component holds no application state of its own beyond which
 * step is on screen.
 *
 * The section heading tells the applicant whether the answers they are typing are
 * identity-sensitive and therefore withheld from blind reviewers. That promise is
 * only worth making if it is visible at the moment those answers are entered.
 */

type ApplicationWorkspaceProps = {
  application: {
    id: string;
    role: ApplicationRole;
    status: ApplicationStatus;
    progress: number;
    answers: Record<string, Record<string, unknown>>;
    answerVersions: Record<string, number>;
  };
  eventName: string;
  sections: SectionDefinition[];
  initialSection?: string;
  notice?: { tone: "success" | "error"; message: string };
};

export function ApplicationWorkspace({
  application,
  eventName,
  sections,
  initialSection,
  notice,
}: ApplicationWorkspaceProps) {
  // `findIndex` returns -1 for an unknown section key, so clamp to 0 rather than
  // letting a hand-edited `?section=` produce an undefined step.
  const initialIndex = Math.max(
    0,
    sections.findIndex((section) => section.key === initialSection),
  );
  const [step, setStep] = useState(initialIndex);
  const section = sections[step];
  const locked = application.status !== "draft";

  return (
    <main className="form-workspace">
      {/* The portal rail is the page's navigation. This panel is a table of
          contents for one form, so it is paper like the rest of the desk — a
          second navy column beside the rail read as a second site. */}
      <nav className="form-steps" aria-label="Application sections">
        <p>
          APPLICATION · {application.role.toUpperCase()}
          <span className={`workspace-state workspace-state--${application.status}`}>
            {application.status.replaceAll("_", " ")}
          </span>
        </p>
        <h1>{eventName}</h1>
        <ol>
          {sections.map((candidate, index) => {
            const complete = isComplete(candidate, application.answers[candidate.key]);
            return (
              <li key={candidate.key}>
                <button type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}>
                  <span>{index + 1}</span>
                  <span>
                    <strong>{candidate.title}</strong>
                    <small>{complete ? "Complete" : "Needs answers"}</small>
                  </span>
                  {complete ? <Check aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className="form-progress"
          role="progressbar"
          aria-label="Application completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={application.progress}
        >
          <span style={{ transform: `scaleX(${application.progress / 100})` }} />
          <strong>{application.progress}% ready</strong>
        </div>
      </nav>
      <section className="form-sheet" aria-labelledby="section-title">
        {notice ? (
          <p className={`workspace-notice workspace-notice--${notice.tone}`} role="status">
            {notice.message}
          </p>
        ) : null}
        <div className="section-heading">
          <p>
            STEP {step + 1} OF {sections.length}
          </p>
          <h2 id="section-title">{section.title}</h2>
          <span>{section.summary}</span>
          {section.identitySensitive ? (
            <small>
              <LockKeyhole aria-hidden /> Identity-sensitive — excluded from blind review
            </small>
          ) : (
            <small>
              <Check aria-hidden /> Included in blind review without your identity
            </small>
          )}
        </div>
        {/* Keep each section mounted. An editor's short autosave can then finish
            when someone moves to the next section immediately after typing. */}
        {sections.map((candidate, index) => (
          <SectionEditor
            key={candidate.key}
            active={step === index}
            applicationId={application.id}
            role={application.role}
            section={candidate}
            values={application.answers[candidate.key] ?? {}}
            answerVersion={application.answerVersions[candidate.key] ?? 0}
            locked={locked}
          />
        ))}
        <nav className="form-pagination" aria-label="Application section navigation">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
            <ChevronLeft aria-hidden />
            Previous
          </button>
          {step < sections.length - 1 ? (
            <button type="button" onClick={() => setStep((current) => Math.min(sections.length - 1, current + 1))}>
              Next section
              <ChevronRight aria-hidden />
            </button>
          ) : canWithdraw(application.status) ? (
            <Withdrawal applicationId={application.id} role={application.role} />
          ) : locked ? (
            <p className="application-locked-note" role="status">
              This application is {application.status.replaceAll("_", " ")} and cannot be changed here.
            </p>
          ) : (
            <Submission applicationId={application.id} role={application.role} progress={application.progress} />
          )}
        </nav>
      </section>
    </main>
  );
}

/**
 * The form for one section, with debounced autosave.
 *
 * The `answerVersion` hidden input is what makes concurrent editing safe: it is
 * posted with every save, and the action refuses the write if the stored version
 * has moved on. `state.answerVersion` then replaces it, so consecutive autosaves
 * chain correctly instead of the second one going stale against the first.
 */
function SectionEditor({
  active,
  applicationId,
  role,
  section,
  values,
  answerVersion,
  locked,
}: {
  active: boolean;
  applicationId: string;
  role: ApplicationRole;
  section: SectionDefinition;
  values: Record<string, unknown>;
  answerVersion: number;
  locked: boolean;
}) {
  const action = saveApplicationSectionAction.bind(null, applicationId, role, section.key);
  const [state, formAction, pending] = useActionState(action, { ...initialApplicationState, answerVersion });
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshedVersion = useRef<number | null>(null);
  const version = state.answerVersion ?? answerVersion;

  // A stale save means the on-screen answers may be out of date. Move focus into
  // the form so a keyboard or screen-reader user is taken to the message rather
  // than left on a button whose label silently changed.
  useEffect(() => {
    if (state.status === "stale") formRef.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [state.status]);

  // Server actions revalidate this route, and refreshing merges the new progress
  // and section completion into the mounted workspace without discarding fields.
  useEffect(() => {
    if (
      state.status !== "saved" ||
      state.answerVersion === undefined ||
      refreshedVersion.current === state.answerVersion
    )
      return;
    refreshedVersion.current = state.answerVersion;
    router.refresh();
  }, [router, state.answerVersion, state.status]);

  // Cancel a pending autosave when leaving the application entirely.
  useEffect(
    () => () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    },
    [],
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="section-form"
      hidden={!active}
      noValidate
      onChange={(event) => {
        if (locked) return;
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        const form = event.currentTarget;
        // 900ms after typing stops: long enough not to save every keystroke, short
        // enough that a closed tab rarely loses work. The form deliberately has
        // `noValidate`: incomplete drafts are valid product state and the server
        // still validates every provided answer.
        autosaveTimer.current = setTimeout(() => form.requestSubmit(), 900);
      }}
    >
      <input type="hidden" name="answerVersion" value={version} />
      <fieldset disabled={locked || pending}>
        {section.fields.map((field) => (
          <ApplicationField
            key={field.key}
            field={field}
            value={values[field.key]}
            error={state.errors?.[field.key]?.[0]}
          />
        ))}
      </fieldset>
      <button type="submit" className="save-draft" disabled={locked || pending}>
        {pending ? (
          <Cloud aria-hidden className="is-saving" />
        ) : state.status === "error" || state.status === "stale" ? (
          <CloudOff aria-hidden />
        ) : (
          <Cloud aria-hidden />
        )}
        {pending ? "Saving…" : (state.message ?? (locked ? "Answers locked" : "Save draft"))}
      </button>
      {/* Autosave is silent by design, so its outcome has to be announced
          somewhere a screen reader will hear it. */}
      <p className={`save-announcement save-announcement--${state.status}`} aria-live="polite">
        {state.status === "saved"
          ? "Your answers are saved."
          : state.status === "error" || state.status === "stale"
            ? state.message
            : ""}
      </p>
    </form>
  );
}

/**
 * One labelled question.
 *
 * The label, the required marker, the help text and the error all live here so
 * every field type gets the same accessible wiring; `FieldControl` below only
 * has to render the input itself.
 */
function ApplicationField({ field, value, error }: { field: FieldDefinition; value: unknown; error?: string }) {
  const helpId = `${field.key}-help`;
  const describedBy = error || field.description ? helpId : undefined;
  return (
    <div className="application-field">
      <span className="application-field__label">
        {/* A multiselect is a fieldset of checkboxes, so it has a legend rather
            than a single control for the label to point at. */}
        <label htmlFor={field.type === "multiselect" ? undefined : field.key}>{field.label}</label>
        {field.required ? <b>Required</b> : <small>Optional</small>}
      </span>
      {field.description ? <em>{field.description}</em> : null}
      <FieldControl field={field} value={value} describedBy={describedBy} invalid={Boolean(error)} />
      {error ? (
        <strong id={helpId} className="field-error">
          {error}
        </strong>
      ) : field.description ? (
        <span id={helpId} className="sr-only">
          {field.description}
        </span>
      ) : null}
    </div>
  );
}

/** The input for one field type. Uncontrolled — the form element is the state. */
function FieldControl({
  field,
  value,
  describedBy,
  invalid,
}: {
  field: FieldDefinition;
  value: unknown;
  describedBy?: string;
  invalid: boolean;
}) {
  const shared = {
    id: field.key,
    name: field.key,
    required: field.required,
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
  };

  switch (field.type) {
    case "textarea":
      return <textarea {...shared} defaultValue={String(value ?? "")} maxLength={field.maxLength} rows={6} />;

    case "multiselect":
      return (
        <fieldset className="choice-grid" aria-describedby={describedBy}>
          <legend className="sr-only">{field.label}</legend>
          {field.options?.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                name={field.key}
                value={option}
                defaultChecked={Array.isArray(value) && value.includes(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>
      );

    case "select":
      return (
        <select {...shared} defaultValue={String(value ?? "")}>
          <option value="">Select one</option>
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      );

    default:
      return (
        <input
          {...shared}
          type={inputType(field.type)}
          defaultValue={String(value ?? "")}
          maxLength={field.maxLength}
        />
      );
  }
}

/** Definition types map to native input types; anything else is plain text. */
function inputType(type: FieldDefinition["type"]) {
  if (type === "url") return "url";
  if (type === "number") return "number";
  return "text";
}

function Submission({
  applicationId,
  role,
  progress,
}: {
  applicationId: string;
  role: ApplicationRole;
  progress: number;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const action = submitApplicationAction.bind(null, applicationId, role);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="submit-application"
        onClick={() => setOpen(true)}
        disabled={progress < 100}
      >
        Review &amp; submit
      </button>
      {open ? (
        <ConfirmationDialog
          titleId="submit-title"
          title={`Lock and submit this ${role} application?`}
          description="Your answers become read-only after submission. You can still withdraw later."
          cancelLabel="Keep editing"
          onClose={() => setOpen(false)}
          returnFocusRef={triggerRef}
        >
          <form action={action}>
            <button type="submit" className="primary-button">
              Submit application
            </button>
          </form>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

function Withdrawal({ applicationId, role }: { applicationId: string; role: ApplicationRole }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const action = withdrawApplicationAction.bind(null, applicationId, role);
  return (
    <>
      <button ref={triggerRef} type="button" className="withdraw-button" onClick={() => setOpen(true)}>
        Withdraw application
      </button>
      {open ? (
        <ConfirmationDialog
          titleId="withdraw-title"
          title="Withdraw this application?"
          description="Organizers will no longer review it. This cannot be undone from the portal."
          cancelLabel="Keep application"
          onClose={() => setOpen(false)}
          returnFocusRef={triggerRef}
          destructive
        >
          <form action={action}>
            <button type="submit" className="withdraw-button">
              Withdraw application
            </button>
          </form>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

function ConfirmationDialog({
  titleId,
  title,
  description,
  cancelLabel,
  onClose,
  returnFocusRef,
  destructive = false,
  children,
}: {
  titleId: string;
  title: string;
  description: string;
  cancelLabel: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  destructive?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const returnFocus = returnFocusRef.current;
    return () => returnFocus?.focus();
  }, [returnFocusRef]);

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-description`}
        className="confirmation-dialog"
        onKeyDown={trapFocus}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p>{destructive ? "CONFIRM WITHDRAWAL" : "FINAL CHECK"}</p>
        <h2 id={titleId}>{title}</h2>
        <span id={`${titleId}-description`}>{description}</span>
        <div>
          <button ref={cancelRef} type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          {children}
        </div>
      </section>
    </div>
  );
}

function canWithdraw(status: ApplicationStatus) {
  return ["submitted", "under_review", "accepted", "waitlisted"].includes(status);
}

/** A section is complete when every required field has a non-empty answer. */
function isComplete(section: SectionDefinition, values: Record<string, unknown> | undefined) {
  if (!values) return false;
  return section.fields
    .filter((field) => field.required)
    .every((field) =>
      Array.isArray(values[field.key]) ? (values[field.key] as unknown[]).length > 0 : Boolean(values[field.key]),
    );
}

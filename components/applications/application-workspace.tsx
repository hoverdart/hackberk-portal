"use client";

import { Check, ChevronLeft, ChevronRight, Cloud, CloudOff, LockKeyhole } from "lucide-react";
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
 * A Client Component because the step navigation and local draft storage are
 * genuinely interactive. Everything that touches data still runs in Server
 * Actions. It keeps only ephemeral UI state: the visible step, local
 * completeness indicators, and a pending navigation intent. Answers remain in
 * the form controls until an explicit account save.
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

type SaveIntent = {
  id: number;
  destination: number | "review";
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
  const [completedSections, setCompletedSections] = useState(() =>
    Object.fromEntries(
      sections.map((candidate) => [candidate.key, isComplete(candidate, application.answers[candidate.key])]),
    ),
  );
  const [saveIntent, setSaveIntent] = useState<SaveIntent | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const nextSaveIntentId = useRef(0);
  const section = sections[step];
  const locked = application.status !== "draft";
  const progress = Math.round((Object.values(completedSections).filter(Boolean).length / sections.length) * 100);

  function requestSaveBefore(destination: SaveIntent["destination"]) {
    if (typeof destination === "number" && destination === step) return;
    if (locked) {
      if (typeof destination === "number") setStep(destination);
      return;
    }
    if (saveIntent) return;
    nextSaveIntentId.current += 1;
    setSaveIntent({ id: nextSaveIntentId.current, destination });
  }

  function finishSaveIntent(result: "saved" | "error") {
    if (!saveIntent) return;
    const intent = saveIntent;
    setSaveIntent(null);
    if (result !== "saved") return;
    if (intent.destination === "review") setReviewOpen(true);
    else setStep(intent.destination);
  }

  function setSectionCompletion(sectionKey: string, complete: boolean) {
    setCompletedSections((current) =>
      current[sectionKey] === complete ? current : { ...current, [sectionKey]: complete },
    );
  }

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
            const complete = completedSections[candidate.key];
            return (
              <li key={candidate.key}>
                <button
                  type="button"
                  onClick={() => requestSaveBefore(index)}
                  aria-current={step === index ? "step" : undefined}
                  disabled={Boolean(saveIntent)}
                >
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
          aria-valuenow={progress}
        >
          <span style={{ transform: `scaleX(${progress / 100})` }} />
          <strong>{progress}% ready</strong>
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
        {/* Keep each section mounted so local drafts and unsaved controls survive
            step navigation while the active section is explicitly saved. */}
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
            saveIntentId={step === index ? saveIntent?.id : undefined}
            onSaveIntentComplete={finishSaveIntent}
            onCompletionChange={setSectionCompletion}
          />
        ))}
        <nav className="form-pagination" aria-label="Application section navigation">
          <button
            type="button"
            onClick={() => requestSaveBefore(Math.max(0, step - 1))}
            disabled={step === 0 || Boolean(saveIntent)}
          >
            <ChevronLeft aria-hidden />
            Previous
          </button>
          {step < sections.length - 1 ? (
            <button
              type="button"
              onClick={() => requestSaveBefore(Math.min(sections.length - 1, step + 1))}
              disabled={Boolean(saveIntent)}
            >
              {saveIntent?.destination === step + 1 ? "Saving draft…" : "Next section"}
              <ChevronRight aria-hidden />
            </button>
          ) : canWithdraw(application.status) ? (
            <Withdrawal applicationId={application.id} role={application.role} />
          ) : locked ? (
            <p className="application-locked-note" role="status">
              This application is {application.status.replaceAll("_", " ")} and cannot be changed here.
            </p>
          ) : (
            <Submission
              applicationId={application.id}
              role={application.role}
              progress={progress}
              open={reviewOpen}
              onClose={() => setReviewOpen(false)}
              onRequestReview={() => requestSaveBefore("review")}
              saving={Boolean(saveIntent)}
            />
          )}
        </nav>
      </section>
    </main>
  );
}

/**
 * The form for one section, with browser-local drafts and explicit saves.
 *
 * The `answerVersion` hidden input is what makes concurrent editing safe: it is
 * posted with every save, and the action refuses the write if the stored version
 * has moved on. Browser-local state is written while typing; the account save
 * happens only when the applicant asks to save or changes sections.
 */
function SectionEditor({
  active,
  applicationId,
  role,
  section,
  values,
  answerVersion,
  locked,
  saveIntentId,
  onSaveIntentComplete,
  onCompletionChange,
}: {
  active: boolean;
  applicationId: string;
  role: ApplicationRole;
  section: SectionDefinition;
  values: Record<string, unknown>;
  answerVersion: number;
  locked: boolean;
  saveIntentId?: number;
  onSaveIntentComplete: (result: "saved" | "error") => void;
  onCompletionChange: (sectionKey: string, complete: boolean) => void;
}) {
  const action = saveApplicationSectionAction.bind(null, applicationId, role, section.key);
  const [state, formAction, pending] = useActionState(action, { ...initialApplicationState, answerVersion });
  const formRef = useRef<HTMLFormElement>(null);
  const submittedDraft = useRef<string | null>(null);
  const lastHandledSaveVersion = useRef<number | null>(null);
  const requestedSave = useRef<{ id: number; baselineVersion: number; observedPending: boolean } | null>(null);
  const version = state.answerVersion ?? answerVersion;

  // A stale save means the on-screen answers may be out of date. Move focus into
  // the form so a keyboard or screen-reader user is taken to the message rather
  // than left on a button whose label silently changed.
  useEffect(() => {
    if (state.status === "stale") formRef.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [state.status]);

  // Restore the latest unsent browser-local draft after mount. This is deliberately
  // local-only: typing never causes a network request or takes the form away.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    restoreLocalDraft(form, localDraftKey(applicationId, section.key));
    onCompletionChange(section.key, isSectionComplete(form, section.fields));
  }, [applicationId, onCompletionChange, section.fields, section.key]);

  // A navigation or review request asks the active form to save once. Wait for
  // the server result before changing the visible section or opening review.
  useEffect(() => {
    if (!saveIntentId || requestedSave.current?.id === saveIntentId) return;
    requestedSave.current = { id: saveIntentId, baselineVersion: version, observedPending: false };
    formRef.current?.requestSubmit();
  }, [saveIntentId, version]);

  useEffect(() => {
    const request = requestedSave.current;
    if (!request) return;
    if (pending) {
      request.observedPending = true;
      return;
    }
    const receivedNewVersion =
      state.status === "saved" && (state.answerVersion ?? request.baselineVersion) > request.baselineVersion;
    if (!request.observedPending && !receivedNewVersion) return;
    requestedSave.current = null;
    onSaveIntentComplete(state.status === "saved" ? "saved" : "error");
  }, [onSaveIntentComplete, pending, state.answerVersion, state.status]);

  // Remove a local draft only if it is exactly the snapshot the server accepted.
  // If somebody continues typing during a save, their newer local work remains.
  useEffect(() => {
    if (
      state.status !== "saved" ||
      state.answerVersion === undefined ||
      lastHandledSaveVersion.current === state.answerVersion
    )
      return;
    lastHandledSaveVersion.current = state.answerVersion;
    const key = localDraftKey(applicationId, section.key);
    if (submittedDraft.current && window.localStorage.getItem(key) === submittedDraft.current)
      window.localStorage.removeItem(key);
  }, [applicationId, section.key, state.answerVersion, state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="section-form"
      hidden={!active}
      noValidate
      onChange={(event) => {
        if (locked) return;
        const form = event.currentTarget;
        persistLocalDraft(form, localDraftKey(applicationId, section.key), section.fields);
        onCompletionChange(section.key, isSectionComplete(form, section.fields));
      }}
      onSubmit={(event) => {
        submittedDraft.current = persistLocalDraft(
          event.currentTarget,
          localDraftKey(applicationId, section.key),
          section.fields,
        );
      }}
    >
      <input type="hidden" name="answerVersion" value={version} />
      <fieldset disabled={locked}>
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
        {pending ? "Saving…" : (state.message ?? (locked ? "Answers locked" : "Save to account"))}
      </button>
      {/* Saving is intentional, but its outcome still needs a non-disruptive
          announcement for screen-reader users. */}
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

function localDraftKey(applicationId: string, sectionKey: string) {
  return `backathons:application-draft:${applicationId}:${sectionKey}`;
}

function persistLocalDraft(form: HTMLFormElement, key: string, fields: FieldDefinition[]) {
  const data = new FormData(form);
  const snapshot = JSON.stringify(
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.type === "multiselect" ? data.getAll(field.key) : (data.get(field.key) ?? ""),
      ]),
    ),
  );
  try {
    window.localStorage.setItem(key, snapshot);
  } catch {
    // Private-browsing or quota restrictions should not prevent an applicant
    // from continuing; the explicit account save remains available.
  }
  return snapshot;
}

function restoreLocalDraft(form: HTMLFormElement, key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    const values: unknown = JSON.parse(stored);
    if (!values || typeof values !== "object" || Array.isArray(values)) return;
    for (const [fieldKey, value] of Object.entries(values)) {
      const controls = form.elements.namedItem(fieldKey);
      if (controls instanceof RadioNodeList) {
        const selected = new Set(Array.isArray(value) ? value.map(String) : []);
        for (const control of controls) {
          if (control instanceof HTMLInputElement && control.type === "checkbox")
            control.checked = selected.has(control.value);
        }
      } else if (
        controls instanceof HTMLInputElement ||
        controls instanceof HTMLTextAreaElement ||
        controls instanceof HTMLSelectElement
      ) {
        controls.value = typeof value === "string" ? value : "";
      }
    }
  } catch {
    // Storage is optional resilience, not a prerequisite for filling the form.
  }
}

function isSectionComplete(form: HTMLFormElement, fields: FieldDefinition[]) {
  const data = new FormData(form);
  return fields.every((field) => {
    const controls = form.elements.namedItem(field.key);
    const control = controls instanceof RadioNodeList ? controls[0] : controls;
    const valid =
      !(
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement
      ) || control.validity.valid;
    if (!valid) return false;
    if (!field.required) return true;
    return field.type === "multiselect"
      ? data.getAll(field.key).length > 0
      : String(data.get(field.key) ?? "").trim().length > 0;
  });
}

function Submission({
  applicationId,
  role,
  progress,
  open,
  onClose,
  onRequestReview,
  saving,
}: {
  applicationId: string;
  role: ApplicationRole;
  progress: number;
  open: boolean;
  onClose: () => void;
  onRequestReview: () => void;
  saving: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const action = submitApplicationAction.bind(null, applicationId, role);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="submit-application"
        onClick={onRequestReview}
        disabled={progress < 100 || saving}
      >
        {saving ? "Saving draft…" : "Review & submit"}
      </button>
      {open ? (
        <ConfirmationDialog
          titleId="submit-title"
          title={`Lock and submit this ${role} application?`}
          description="Your answers become read-only after submission. You can still withdraw later."
          cancelLabel="Keep editing"
          onClose={onClose}
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
      Array.isArray(values[field.key])
        ? (values[field.key] as unknown[]).length > 0
        : String(values[field.key] ?? "").trim().length > 0,
    );
}

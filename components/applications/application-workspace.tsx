"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, Cloud, CloudOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { saveApplicationSectionAction, submitApplicationAction, withdrawApplicationAction } from "@/app/(portal)/applications/actions";
import type { FieldDefinition, SectionDefinition } from "@/lib/applications/definitions";
import type { ApplicationRole, ApplicationStatus } from "@/lib/domain/applications";
import { initialApplicationState } from "@/lib/validation/applications";

type ApplicationWorkspaceProps = {
  application: { id: string; role: ApplicationRole; status: ApplicationStatus; progress: number; answers: Record<string, Record<string, unknown>>; answerVersions: Record<string, number> };
  eventName: string;
  sections: SectionDefinition[];
  initialSection?: string;
  notice?: { tone: "success" | "error"; message: string };
};

export function ApplicationWorkspace({ application, eventName, sections, initialSection, notice }: ApplicationWorkspaceProps) {
  const initialIndex = Math.max(0, sections.findIndex((section) => section.key === initialSection));
  const [step, setStep] = useState(initialIndex);
  const section = sections[step];
  const locked = application.status !== "draft";

  return (
    <main className="form-workspace">
      <header className="workspace-header"><Link href="/dashboard"><ArrowLeft aria-hidden />All applications</Link><span className={`workspace-state workspace-state--${application.status}`}>{application.status.replaceAll("_", " ")}</span></header>
      <aside className="form-steps" aria-label="Application sections">
        <p>APPLICATION · {application.role.toUpperCase()}</p>
        <h1>{eventName}</h1>
        <ol>{sections.map((candidate, index) => <li key={candidate.key}><button type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}><span>{index + 1}</span><span><strong>{candidate.title}</strong><small>{isComplete(candidate, application.answers[candidate.key]) ? "Complete" : "Needs answers"}</small></span>{isComplete(candidate, application.answers[candidate.key]) ? <Check aria-hidden /> : null}</button></li>)}</ol>
        <div className="form-progress"><span style={{ width: `${application.progress}%` }} /><strong>{application.progress}% ready</strong></div>
      </aside>
      <section className="form-sheet" aria-labelledby="section-title">
        {notice ? <p className={`workspace-notice workspace-notice--${notice.tone}`} role="status">{notice.message}</p> : null}
        <div className="section-heading"><p>STEP {step + 1} OF {sections.length}</p><h2 id="section-title">{section.title}</h2><span>{section.summary}</span>{section.identitySensitive ? <small><LockKeyhole aria-hidden /> Identity-sensitive — excluded from blind review</small> : <small><Check aria-hidden /> Included in blind review without your identity</small>}</div>
        <SectionEditor key={section.key} applicationId={application.id} role={application.role} section={section} values={application.answers[section.key] ?? {}} answerVersion={application.answerVersions[section.key] ?? 0} locked={locked} />
        <nav className="form-pagination" aria-label="Application section navigation"><button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ChevronLeft aria-hidden />Previous</button>{step < sections.length - 1 ? <button type="button" onClick={() => setStep((current) => Math.min(sections.length - 1, current + 1))}>Next section<ChevronRight aria-hidden /></button> : locked ? <Withdrawal applicationId={application.id} role={application.role} /> : <Submission applicationId={application.id} role={application.role} progress={application.progress} />}</nav>
      </section>
    </main>
  );
}

function SectionEditor({ applicationId, role, section, values, answerVersion, locked }: { applicationId: string; role: ApplicationRole; section: SectionDefinition; values: Record<string, unknown>; answerVersion: number; locked: boolean }) {
  const action = saveApplicationSectionAction.bind(null, applicationId, role, section.key);
  const [state, formAction, pending] = useActionState(action, { ...initialApplicationState, answerVersion });
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = state.answerVersion ?? answerVersion;

  useEffect(() => {
    if (state.status === "stale") formRef.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [state.status]);

  useEffect(() => () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
  }, []);

  return (
    <form ref={formRef} action={formAction} className="section-form" onChange={(event) => {
      if (locked) return;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      const form = event.currentTarget;
      autosaveTimer.current = setTimeout(() => form.requestSubmit(), 900);
    }}>
      <input type="hidden" name="answerVersion" value={version} />
      <fieldset disabled={locked || pending}>{section.fields.map((field) => <ApplicationField key={field.key} field={field} value={values[field.key]} error={state.errors?.[field.key]?.[0]} />)}</fieldset>
      <button type="submit" className="save-draft" disabled={locked || pending}>{pending ? <Cloud aria-hidden className="is-saving" /> : state.status === "error" || state.status === "stale" ? <CloudOff aria-hidden /> : <Cloud aria-hidden />}{pending ? "Saving…" : state.message ?? (locked ? "Answers locked" : "Save draft")}</button>
      <p className={`save-announcement save-announcement--${state.status}`} aria-live="polite">{state.status === "saved" ? "Your answers are saved." : state.status === "error" || state.status === "stale" ? state.message : ""}</p>
    </form>
  );
}

function ApplicationField({ field, value, error }: { field: FieldDefinition; value: unknown; error?: string }) {
  const helpId = `${field.key}-help`;
  const inputProps = { id: field.key, name: field.key, required: field.required, "aria-invalid": Boolean(error), "aria-describedby": error || field.description ? helpId : undefined };
  return (
    <div className="application-field"><span className="application-field__label"><label htmlFor={field.type === "multiselect" ? undefined : field.key}>{field.label}</label>{field.required ? <b>Required</b> : <small>Optional</small>}</span>{field.description ? <em>{field.description}</em> : null}
      {field.type === "textarea" ? <textarea {...inputProps} defaultValue={String(value ?? "")} maxLength={field.maxLength} rows={6} /> : field.type === "multiselect" ? <fieldset className="choice-grid" aria-describedby={error || field.description ? helpId : undefined}><legend className="sr-only">{field.label}</legend>{field.options?.map((option) => <label key={option}><input type="checkbox" name={field.key} value={option} defaultChecked={Array.isArray(value) && value.includes(option)} />{option}</label>)}</fieldset> : field.type === "select" ? <select {...inputProps} defaultValue={String(value ?? "")}><option value="">Select one</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <input {...inputProps} type={field.type === "url" ? "url" : field.type === "number" ? "number" : "text"} defaultValue={String(value ?? "")} maxLength={field.maxLength} />}
      {error ? <strong id={helpId} className="field-error">{error}</strong> : field.description ? <span id={helpId} className="sr-only">{field.description}</span> : null}
    </div>
  );
}

function Submission({ applicationId, role, progress }: { applicationId: string; role: ApplicationRole; progress: number }) {
  const [open, setOpen] = useState(false);
  const action = submitApplicationAction.bind(null, applicationId, role);
  return <><button type="button" className="submit-application" onClick={() => setOpen(true)} disabled={progress < 100}>Review & submit</button>{open ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="submit-title" className="confirmation-dialog" onMouseDown={(event) => event.stopPropagation()}><p>FINAL CHECK</p><h2 id="submit-title">Lock and submit this {role} application?</h2><span>Your answers become read-only after submission. You can still withdraw later.</span><div><button type="button" onClick={() => setOpen(false)}>Keep editing</button><form action={action}><button type="submit" className="primary-button">Submit application</button></form></div></section></div> : null}</>;
}

function Withdrawal({ applicationId, role }: { applicationId: string; role: ApplicationRole }) {
  return <form action={withdrawApplicationAction.bind(null, applicationId, role)}><button type="submit" className="withdraw-button">Withdraw application</button></form>;
}

function isComplete(section: SectionDefinition, values: Record<string, unknown> | undefined) {
  if (!values) return false;
  return section.fields.filter((field) => field.required).every((field) => Array.isArray(values[field.key]) ? (values[field.key] as unknown[]).length > 0 : Boolean(values[field.key]));
}

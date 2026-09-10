"use client";

import { AlertTriangle, ArrowLeft, Check, EyeOff, Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { decideApplicationAction, reportConflictAction, saveReviewAction } from "@/app/(organizer)/organizer/actions";
import type { RubricCriterion } from "@/lib/reviews/rubric";
import { initialReviewState } from "@/lib/validation/reviews";

type ReviewWorkspaceProps = {
  application: { id: string; role: string; status: string };
  eventName: string;
  answers: Array<{ section_key: string; answers: unknown }>;
  assignment: { id: string; status: string; conflict_reason: string | null };
  review: { scores: unknown; recommendation: string | null; private_notes: string | null; status: string } | null;
  criteria: RubricCriterion[];
  aggregate: number | null;
  submittedReviewCount: number;
  canDecide: boolean;
  notice?: { tone: "success" | "error"; message: string };
};

export function ReviewWorkspace({ application, eventName, answers, assignment, review, criteria, aggregate, submittedReviewCount, canDecide, notice }: ReviewWorkspaceProps) {
  const locked = review?.status === "submitted" || assignment.status === "conflict";
  const [showConflict, setShowConflict] = useState(false);
  const saveAction = saveReviewAction.bind(null, application.id, assignment.id, false);
  const submitAction = saveReviewAction.bind(null, application.id, assignment.id, true);
  const [saveState, saveFormAction, saving] = useActionState(saveAction, initialReviewState);
  const [submitState, submitFormAction, submitting] = useActionState(submitAction, initialReviewState);
  const state = submitState.status !== "idle" ? submitState : saveState;
  const currentScores = (review?.scores ?? {}) as Record<string, number>;

  return <main className="review-workspace"><header><Link href="/organizer/applications"><ArrowLeft aria-hidden />Application queue</Link><span><EyeOff aria-hidden />Blind review · applicant identity hidden</span></header><section className="review-context"><p>{eventName}</p><h1>{application.role} application</h1><div><span>STATUS <strong>{application.status.replaceAll("_", " ")}</strong></span><span>REVIEWS <strong>{submittedReviewCount}/2 submitted</strong></span><span>AGGREGATE <strong>{aggregate ? `${aggregate.toFixed(2)} / 5` : "Hidden until submission"}</strong></span></div></section>{notice ? <p className={`workspace-notice workspace-notice--${notice.tone}`}>{notice.message}</p> : null}<div className="review-columns"><article className="blind-answers"><h2>Application answers</h2>{answers.length ? answers.map((section) => <section key={section.section_key}><h3>{section.section_key.replaceAll("_", " ")}</h3>{Object.entries(section.answers as Record<string, unknown>).map(([key, value]) => <div key={key}><strong>{key.replaceAll(/([A-Z])/g, " $1")}</strong><p>{Array.isArray(value) ? value.join(", ") : String(value)}</p></div>)}</section>) : <p className="empty-state">No blind-review answers were submitted.</p>}</article><form action={saveFormAction} className="rubric-sheet"><fieldset disabled={locked || saving || submitting}><p>INDEPENDENT RUBRIC</p><h2>Your review</h2>{criteria.map((criterion) => <fieldset className="rubric-row" key={criterion.key}><legend>{criterion.label}<small>{Math.round(criterion.weight * 100)}% weight</small></legend><div>{[1,2,3,4,5].map((score) => <label key={score}><input type="radio" name={`score_${criterion.key}`} value={score} defaultChecked={currentScores[criterion.key] === score} /><span>{score}</span></label>)}</div>{state.errors?.[criterion.key] ? <small className="field-error">{state.errors[criterion.key][0]}</small> : null}</fieldset>)}<label className="rubric-notes">Recommendation<select name="recommendation" defaultValue={review?.recommendation ?? ""}><option value="">Choose one</option><option value="accepted">Accept</option><option value="waitlisted">Waitlist</option><option value="rejected">Reject</option></select>{state.errors?.recommendation ? <small className="field-error">{state.errors.recommendation[0]}</small> : null}</label><label className="rubric-notes">Private notes<textarea name="privateNotes" rows={5} defaultValue={review?.private_notes ?? ""} maxLength={5000} /></label></fieldset><p className={`save-announcement save-announcement--${state.status}`} aria-live="polite">{state.message}</p><div className="rubric-actions"><button type="button" onClick={() => setShowConflict(true)} disabled={locked}><AlertTriangle aria-hidden />Report conflict</button><button type="submit" disabled={locked || saving}><Save aria-hidden />{saving ? "Saving…" : "Save draft"}</button><button type="submit" formAction={submitFormAction} className="primary-button" disabled={locked || submitting}><Check aria-hidden />{submitting ? "Submitting…" : "Submit review"}</button></div></form></div>{canDecide ? <DecisionBar applicationId={application.id} reviewCount={submittedReviewCount} /> : null}{showConflict ? <ConflictDialog applicationId={application.id} assignmentId={assignment.id} close={() => setShowConflict(false)} /> : null}</main>;
}

function DecisionBar({ applicationId, reviewCount }: { applicationId: string; reviewCount: number }) {
  return <aside className="decision-bar"><div><p>FINAL DECISION</p><strong>{reviewCount < 2 ? "Two independent reviews are required." : "Both reviews are in. Choose the final status."}</strong></div>{(["accepted", "waitlisted", "rejected"] as const).map((decision) => <form key={decision} action={decideApplicationAction.bind(null, applicationId, decision)}><button type="submit" disabled={reviewCount < 2}>{decision === "accepted" ? "Accept" : decision === "waitlisted" ? "Waitlist" : "Reject"}</button></form>)}</aside>;
}

function ConflictDialog({ applicationId, assignmentId, close }: { applicationId: string; assignmentId: string; close: () => void }) {
  return <div className="dialog-backdrop" onMouseDown={close}><form action={reportConflictAction.bind(null, applicationId, assignmentId)} className="confirmation-dialog" onMouseDown={(event) => event.stopPropagation()}><p>REVIEW INTEGRITY</p><h2>Report a conflict</h2><label className="rubric-notes">Why can’t you review this application?<textarea name="reason" minLength={4} maxLength={1000} required rows={4} /></label><div><button type="button" onClick={close}>Cancel</button><button className="primary-button" type="submit">Report conflict</button></div></form></div>;
}

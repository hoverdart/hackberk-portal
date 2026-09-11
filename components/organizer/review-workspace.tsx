"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SheetHeader } from "@/components/ui/sheet-header";
import { AlertTriangle, Check, Eye, EyeOff, Save } from "lucide-react";
import { useActionState, useState } from "react";

import {
  decideApplicationAction,
  reportConflictAction,
  saveReviewAction,
} from "@/app/(app)/(organizer)/organizer/actions";
import type { RubricCriterion } from "@/lib/reviews/rubric";
import { initialReviewState } from "@/lib/validation/reviews";

/**
 * The blind review workspace.
 *
 * Scoring happens against `answers`, which arrives already filtered — the query
 * in `lib/data/organizer.ts` excludes identity-sensitive sections, so the
 * applicant's name and school are not in those props and never reach the
 * browser. Do not add a lookup here to "enrich" that display; it would defeat
 * the mechanism.
 *
 * `applicant` and `logisticsAnswers` are the deliberate exception, and they are
 * the reason the rule is a sequence rather than a prohibition: you score what
 * was written, and then you learn who wrote it and what they need to take part.
 * The same query withholds both until a blind review exists, so this component
 * cannot show them early even if it tried.
 */

type ReviewWorkspaceProps = {
  application: { id: string; role: string; status: string };
  eventName: string;
  answers: Array<{ section_key: string; answers: unknown }>;
  assignment: { id: string; status: string; conflict_reason: string | null };
  review: { scores: unknown; recommendation: string | null; private_notes: string | null; status: string } | null;
  criteria: RubricCriterion[];
  aggregate: number | null;
  submittedReviewCount: number;
  /** Present only once a blind review is submitted; the query withholds it until then. */
  applicant: {
    full_name: string | null;
    preferred_name: string | null;
    school: string | null;
    graduation_year: number | null;
    pronouns: string | null;
  } | null;
  /** Logistics and access needs — organizer context, never scoring input. */
  logisticsAnswers: Array<{ section_key: string; answers: unknown }>;
  canDecide: boolean;
  notice?: { tone: "success" | "error"; message: string };
};

export function ReviewWorkspace({
  application,
  eventName,
  answers,
  assignment,
  review,
  criteria,
  aggregate,
  submittedReviewCount,
  applicant,
  logisticsAnswers,
  canDecide,
  notice,
}: ReviewWorkspaceProps) {
  // A submitted review is final, and declaring a conflict releases the assignment
  // — either way the form becomes read-only rather than disappearing, so the
  // organizer can still see what they recorded.
  const locked = review?.status === "submitted" || assignment.status === "conflict";
  const [showConflict, setShowConflict] = useState(false);
  // React resets a `<form action={fn}>` on every submission. A radio survives
  // because React syncs `defaultChecked` onto the DOM property, but a `<select>`
  // has no `defaultValue` property — its default is whichever `<option>` carries
  // `selected`, and React marks none — so reset snapped this back to "Choose
  // one" every time. The organizer's recommendation was reaching the database
  // and then disappearing from the screen. Controlled state is what holds it.
  const [recommendation, setRecommendation] = useState(review?.recommendation ?? "");
  const [state, formAction, pending] = useActionState(
    saveReviewAction.bind(null, application.id, assignment.id),
    initialReviewState,
  );
  const currentScores = (review?.scores ?? {}) as Record<string, number>;

  return (
    <main className="review-workspace">
      {/* The rail already carries "Application queue" and marks it current, so
          this bar holds only the thing the rail cannot say: that the applicant's
          identity is deliberately absent from the page. */}
      <header>
        <span>
          {applicant ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
          {applicant
            ? "Scored. Who they are, and what they need, is below."
            : "You score what was written. Who wrote it stays hidden until you submit."}
        </span>
      </header>
      <section className="review-context">
        <p>{eventName}</p>
        <h1>{application.role} application</h1>
        <div>
          <span>
            STATUS <strong>{application.status.replaceAll("_", " ")}</strong>
          </span>
          <span>
            REVIEW <strong>{submittedReviewCount ? "Submitted" : "In progress"}</strong>
          </span>
          <span>
            SCORE <strong>{aggregate ? `${aggregate.toFixed(2)} / 5` : "Shown once you submit"}</strong>
          </span>
        </div>
      </section>
      {notice ? <p className={`workspace-notice workspace-notice--${notice.tone}`}>{notice.message}</p> : null}
      {applicant ? <ApplicantPanel applicant={applicant} answers={logisticsAnswers} /> : null}
      <div className="review-columns">
        <article className="blind-answers">
          <h2>Application answers</h2>
          {answers.length ? (
            answers.map((section) => (
              <section key={section.section_key}>
                <h3>{section.section_key.replaceAll("_", " ")}</h3>
                {Object.entries(section.answers as Record<string, unknown>).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key.replaceAll(/([A-Z])/g, " $1")}</strong>
                    <p>{Array.isArray(value) ? value.join(", ") : String(value)}</p>
                  </div>
                ))}
              </section>
            ))
          ) : (
            <p className="empty-state">No blind-review answers were submitted.</p>
          )}
        </article>
        <form action={formAction} className="rubric-sheet">
          <fieldset disabled={locked || pending}>
            <h2>Your scores</h2>
            {criteria.map((criterion) => (
              <fieldset className="rubric-row" key={criterion.key}>
                <legend>
                  {criterion.label}
                  <small>{Math.round(criterion.weight * 100)}% weight</small>
                </legend>
                <div>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <label key={score}>
                      <input
                        type="radio"
                        name={`score_${criterion.key}`}
                        value={score}
                        defaultChecked={currentScores[criterion.key] === score}
                      />
                      <span>{score}</span>
                    </label>
                  ))}
                </div>
                {state.errors?.[criterion.key] ? (
                  <small className="field-error">{state.errors[criterion.key][0]}</small>
                ) : null}
              </fieldset>
            ))}
            <label className="rubric-notes">
              Recommendation
              <select
                name="recommendation"
                value={recommendation}
                onChange={(event) => setRecommendation(event.target.value)}
              >
                <option value="">Choose one</option>
                <option value="accepted">Accept</option>
                <option value="waitlisted">Waitlist</option>
                <option value="rejected">Reject</option>
              </select>
              {state.errors?.recommendation ? (
                <small className="field-error">{state.errors.recommendation[0]}</small>
              ) : null}
            </label>
            <label className="rubric-notes">
              Private notes
              <textarea name="privateNotes" rows={5} defaultValue={review?.private_notes ?? ""} maxLength={5000} />
            </label>
          </fieldset>
          <p className={`save-announcement save-announcement--${state.status}`} aria-live="polite">
            {state.message}
          </p>
          <div className="rubric-actions">
            <Button
              variant="danger"
              type="button"
              icon={<AlertTriangle aria-hidden />}
              onClick={() => setShowConflict(true)}
              disabled={locked || pending}
            >
              Report conflict
            </Button>
            {/* The pressed button's value is what lands in the FormData, which
                is how one action serves both intents. */}
            <Button type="submit" name="intent" value="save" icon={<Save aria-hidden />} disabled={locked || pending}>
              Save draft
            </Button>
            <Button
              variant="primary"
              type="submit"
              name="intent"
              value="submit"
              icon={<Check aria-hidden />}
              disabled={locked || pending}
            >
              {pending ? "Working…" : "Submit review"}
            </Button>
          </div>
        </form>
      </div>
      {canDecide ? <DecisionBar applicationId={application.id} reviewCount={submittedReviewCount} /> : null}
      {showConflict ? (
        <Dialog
          title="Report a conflict"
          description="This hands the application back to the queue and records why, so the decision stays defensible later."
          onClose={() => setShowConflict(false)}
        >
          <form action={reportConflictAction.bind(null, application.id, assignment.id)} className="dialog-form">
            <label className="rubric-notes">
              Why can’t you review this application?
              <textarea name="reason" minLength={4} maxLength={1000} required rows={4} />
            </label>
            <Button variant="danger" type="submit">
              Report conflict
            </Button>
          </form>
        </Dialog>
      ) : null}
    </main>
  );
}

/**
 * Who the applicant is, and what they need in order to take part.
 *
 * Only rendered once the blind review is in, and only populated then — the
 * query withholds both until a score exists, so this panel cannot be coaxed
 * into appearing early. Logistics sits here rather than in the scoring packet on
 * purpose: an organizer has to know about a dietary need or an accommodation to
 * run the event, and a review must never be influenced by one.
 */
function ApplicantPanel({
  applicant,
  answers,
}: {
  applicant: NonNullable<ReviewWorkspaceProps["applicant"]>;
  answers: ReviewWorkspaceProps["logisticsAnswers"];
}) {
  const details: Array<[string, string]> = [
    ["Name", applicant.preferred_name || applicant.full_name || "Not given"],
    ["School", applicant.school || "Not given"],
    ["Graduation", applicant.graduation_year ? String(applicant.graduation_year) : "Not given"],
    ["Pronouns", applicant.pronouns || "Not given"],
  ];
  return (
    <section className="applicant-panel">
      <SheetHeader icon={Eye} title="Who this is, and what they need" eyebrow="Not part of the score" />
      <dl className="applicant-details">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {answers.length ? (
        answers.map((section) => (
          <div key={section.section_key} className="applicant-answers">
            {Object.entries(section.answers as Record<string, unknown>).map(([key, value]) => (
              <div key={key}>
                <strong>{key.replaceAll(/([A-Z])/g, " $1")}</strong>
                <p>{(Array.isArray(value) ? value.join(", ") : String(value)) || "Not given"}</p>
              </div>
            ))}
          </div>
        ))
      ) : (
        <p className="applicant-empty">This applicant left the logistics section blank.</p>
      )}
    </section>
  );
}

function DecisionBar({ applicationId, reviewCount }: { applicationId: string; reviewCount: number }) {
  return (
    <aside className="decision-bar">
      {/* Only speak when the buttons are disabled and the reason is not visible.
          Once they are live, "Choose the outcome" is a caption on three buttons
          already labelled Accept, Waitlist and Reject. */}
      <div>{reviewCount < 1 ? <strong>Submit your scores before recording a decision.</strong> : null}</div>
      {(
        [
          ["accepted", "Accept", "primary"],
          ["waitlisted", "Waitlist", "secondary"],
          ["rejected", "Reject", "danger"],
        ] as const
      ).map(([decision, label, variant]) => (
        <form key={decision} action={decideApplicationAction.bind(null, applicationId, decision)}>
          <Button variant={variant} type="submit" disabled={reviewCount < 1}>
            {label}
          </Button>
        </form>
      ))}
    </aside>
  );
}

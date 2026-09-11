import { claimReviewAction } from "@/app/(organizer)/organizer/actions";
import { ReviewWorkspace } from "@/components/organizer/review-workspace";
import { requireOrganizer } from "@/lib/auth/guards";
import { getReviewWorkspace } from "@/lib/data/organizer";
import { aggregateSubmittedReviews, parseRubric } from "@/lib/reviews/rubric";
import { reviewIdSchema } from "@/lib/validation/reviews";
import { MessageSheet } from "@/components/ui/message-sheet";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> };

/**
 * One application's blind review sheet.
 *
 * The identity-sensitive answers are dropped by the query, not by this page, so
 * they are absent from the payload rather than merely unrendered.
 */
export default async function ReviewPage({ params, searchParams }: PageProps) {
  const applicationId = reviewIdSchema.parse((await params).id);
  const organizer = await requireOrganizer();
  const workspace = await getReviewWorkspace(applicationId, organizer.id);
  if (!workspace)
    return (
      <MessageSheet
        docket="REVIEW DESK"
        title="Application not found."
        back={{ href: "/organizer/applications", label: "Return to the queue" }}
      />
    );
  if (!workspace.ownAssignment) {
    return (
      <MessageSheet
        docket="ORGANIZER BLIND REVIEW"
        title={workspace.assignments.length ? "This blind review is already claimed." : "Claim this blind review."}
        body={
          workspace.assignments.length
            ? "One organizer owns this application’s active blind review. It becomes available again only if they report a conflict."
            : "Claiming it gives you the one blind rubric review required before a final decision."
        }
        back={{ href: "/organizer/applications", label: "Return to the queue" }}
      >
        {workspace.assignments.length === 0 ? (
          <form action={claimReviewAction.bind(null, applicationId)}>
            <button className="primary-button" type="submit">
              Claim blind review
            </button>
          </form>
        ) : (
          <p className="start-sheet__lede">The active organizer can report a conflict to return it to the queue.</p>
        )}
      </MessageSheet>
    );
  }
  const criteria = parseRubric(workspace.event?.application_rubric);
  const submittedReviews = workspace.submittedReviews.map((review) => ({
    status: review.status,
    scores: review.scores as Record<string, number>,
  }));
  const query = await searchParams;
  return (
    <ReviewWorkspace
      application={workspace.application}
      eventName={workspace.event?.name ?? "Hackathon"}
      answers={workspace.answers}
      assignment={workspace.ownAssignment}
      review={workspace.review}
      criteria={criteria}
      aggregate={aggregateSubmittedReviews(submittedReviews, criteria)}
      submittedReviewCount={submittedReviews.length}
      canDecide
      notice={reviewNotice(query)}
    />
  );
}

function reviewNotice(query: { error?: string; success?: string }) {
  if (query.success === "decision")
    return { tone: "success" as const, message: "Final decision recorded in the audit trail." };
  if (query.error === "one-review-required")
    return { tone: "error" as const, message: "Submit the organizer blind review before recording a decision." };
  if (query.error)
    return { tone: "error" as const, message: "That action did not finish. Existing review data is unchanged." };
  return undefined;
}

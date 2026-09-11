import { Button } from "@/components/ui/button";
import { claimReviewAction } from "@/app/(app)/(organizer)/organizer/actions";
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
        title="Application not found."
        back={{ href: "/organizer/applications", label: "Back to applications" }}
      />
    );
  if (!workspace.ownAssignment) {
    return (
      <MessageSheet
        title={workspace.assignments.length ? "Someone else is reviewing this." : "Claim this review."}
        body={
          workspace.assignments.length
            ? "One organizer reviews each application. It frees up again only if they report a conflict."
            : "Claiming it makes you the reviewer of record. A decision needs your scores first."
        }
        back={{ href: "/organizer/applications", label: "Back to applications" }}
      >
        {workspace.assignments.length === 0 ? (
          <form action={claimReviewAction.bind(null, applicationId)}>
            <Button variant="primary" type="submit">
              Claim this review
            </Button>
          </form>
        ) : (
          <p className="start-sheet__lede">They can report a conflict to hand it back.</p>
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
  if (query.success === "decision") return { tone: "success" as const, message: "Decision recorded." };
  if (query.error === "one-review-required")
    return { tone: "error" as const, message: "Submit your scores before recording a decision." };
  if (query.error) return { tone: "error" as const, message: "That did not go through. Nothing was changed." };
  return undefined;
}

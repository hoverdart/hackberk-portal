import { assignReviewerAction } from "@/app/(organizer)/organizer/actions";
import { ReviewWorkspace } from "@/components/organizer/review-workspace";
import { requireEventStaff, requireOrganizer } from "@/lib/auth/guards";
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
  const staff = await requireEventStaff();
  const workspace = await getReviewWorkspace(applicationId, staff.id);
  if (!workspace)
    return (
      <MessageSheet
        docket="REVIEW DESK"
        title="Application not found."
        back={{ href: "/organizer/applications", label: "Return to the queue" }}
      />
    );
  if (!workspace.ownAssignment) {
    const organizer = await requireOrganizer(workspace.application.event_id);
    return (
      <MessageSheet
        docket="BLIND REVIEW ASSIGNMENT"
        title="This application is not in your queue."
        body={`${workspace.assignments.length} of 2 reviewer seats are filled.`}
        back={{ href: "/organizer/applications", label: "Return to the queue" }}
      >
        {workspace.assignments.length < 2 ? (
          <form action={assignReviewerAction.bind(null, applicationId, organizer.id)}>
            <button className="primary-button" type="submit">
              Assign to me
            </button>
          </form>
        ) : (
          <p className="start-sheet__lede">Ask an organizer to change the assignment.</p>
        )}
      </MessageSheet>
    );
  }
  const criteria = parseRubric(workspace.event?.application_rubric);
  const submittedReviews = workspace.submittedReviews.map((review) => ({
    status: review.status,
    scores: review.scores as Record<string, number>,
  }));
  const canDecide = staff.staffRole === "organizer";
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
      canDecide={canDecide}
      notice={reviewNotice(query)}
    />
  );
}

function reviewNotice(query: { error?: string; success?: string }) {
  if (query.success === "decision")
    return { tone: "success" as const, message: "Final decision recorded in the audit trail." };
  if (query.error === "two-reviews-required")
    return { tone: "error" as const, message: "Wait for both independent reviews before deciding." };
  if (query.error)
    return { tone: "error" as const, message: "That action did not finish. Existing review data is unchanged." };
  return undefined;
}

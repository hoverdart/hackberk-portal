import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

import { startApplicationAction } from "@/app/(app)/(portal)/applications/actions";
import { ApplicationWorkspace } from "@/components/applications/application-workspace";
import { getApplicationDefinition } from "@/lib/applications/definitions";
import { requireApplicant } from "@/lib/auth/guards";
import { getActiveEvent, getApplication } from "@/lib/data/applications";
import { applicationRoleSchema } from "@/lib/validation/applications";
import { MessageSheet } from "@/components/ui/message-sheet";

type PageProps = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ error?: string; success?: string; section?: string }>;
};

/**
 * The application wizard for one role.
 *
 * Renders one of three states: no active event, no application started yet, or
 * the wizard itself. The role comes from the URL and is parsed against the enum
 * before it is used, so `/applications/anything` is a clean 404 rather than a
 * failed query.
 */
export default async function ApplicationPage({ params, searchParams }: PageProps) {
  const roleResult = applicationRoleSchema.safeParse((await params).role);
  if (!roleResult.success) notFound();
  const role = roleResult.data;
  const user = await requireApplicant();
  const event = await getActiveEvent();
  if (!event) return <ApplicationUnavailable />;
  const application = await getApplication(user.id, event.id, role);
  if (!application) return <StartApplication role={role} event={event} />;
  const query = await searchParams;
  return (
    <ApplicationWorkspace
      application={application}
      eventName={event.name}
      sections={getApplicationDefinition(role)}
      initialSection={query.section}
      notice={noticeFromQuery(query)}
    />
  );
}

function StartApplication({
  role,
  event,
}: {
  role: string;
  event: { id: string; name: string; closesAt: string; synthetic: boolean };
}) {
  return (
    <MessageSheet
      docket={`${role.toUpperCase()} CREDENTIAL`}
      title={`Start your ${role} application.`}
      body={`Your draft is separate from every other role. Start now, move section by section, and come back anytime before applications close on ${closingDate(event.closesAt)}.`}
      back={{ href: "/dashboard", label: "Back to all applications" }}
    >
      <form action={startApplicationAction.bind(null, event.id, role)}>
        <Button variant="primary" type="submit">
          Create {role} application
        </Button>
      </form>
    </MessageSheet>
  );
}

function ApplicationUnavailable() {
  return (
    <MessageSheet
      docket="APPLICATION DESK"
      title="No active event is open."
      body="There is no application cycle accepting entries right now. Try again later, or contact an organizer if you were expecting one to be open."
      back={{ href: "/dashboard", label: "Return to the dashboard" }}
    />
  );
}

/** The application deadline, written the way the rest of the portal writes dates. */
function closingDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "America/Los_Angeles" }).format(
    new Date(value),
  );
}

/**
 * Turn the query string an action redirected with into a message.
 *
 * Server Actions cannot return a value across a redirect, so outcomes travel in
 * the URL. Mapping the codes to copy here — rather than putting the sentence in
 * the URL — keeps user-facing text out of link bars and browser history.
 */
function noticeFromQuery(query: { error?: string; success?: string }) {
  if (query.success === "submitted")
    return { tone: "success" as const, message: "Application submitted. Your answers are now locked." };
  if (query.success === "withdrawn")
    return { tone: "success" as const, message: "Application withdrawn. Organizers will no longer review it." };
  if (query.error === "incomplete")
    return { tone: "error" as const, message: "Complete every required answer before submitting." };
  if (query.error)
    return { tone: "error" as const, message: "That action did not finish. Your existing application is unchanged." };
  return undefined;
}

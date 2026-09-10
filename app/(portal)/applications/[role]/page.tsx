import { notFound } from "next/navigation";

import { startApplicationAction } from "@/app/(portal)/applications/actions";
import { ApplicationWorkspace } from "@/components/applications/application-workspace";
import { getApplicationDefinition } from "@/lib/applications/definitions";
import { requireUser } from "@/lib/auth/guards";
import { getActiveEvent, getApplication } from "@/lib/data/applications";
import { applicationRoleSchema } from "@/lib/validation/applications";

type PageProps = { params: Promise<{ role: string }>; searchParams: Promise<{ error?: string; success?: string; section?: string }> };

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
  const user = await requireUser();
  const event = await getActiveEvent();
  if (!event) return <ApplicationUnavailable />;
  const application = await getApplication(user.id, event.id, role);
  if (!application) return <StartApplication role={role} event={event} />;
  const query = await searchParams;
  return <ApplicationWorkspace application={application} eventName={event.name} sections={getApplicationDefinition(role)} initialSection={query.section} notice={noticeFromQuery(query)} />;
}

function StartApplication({ role, event }: { role: string; event: { id: string; name: string; closesAt: string; synthetic: boolean } }) {
  return <main className="start-application"><p>{role.toUpperCase()} CREDENTIAL</p><h1>Start your {role} application.</h1><span>{event.name}{event.synthetic ? " · Synthetic demo event" : ""}</span><p>Your draft is separate from every other role. Start now, move section by section, and come back anytime before the deadline.</p><form action={startApplicationAction.bind(null, event.id, role)}><button className="primary-button" type="submit">Create {role} application</button></form><a href="/dashboard">Back to all applications</a></main>;
}

function ApplicationUnavailable() { return <main className="start-application"><p>APPLICATION DESK</p><h1>No active event is available.</h1><span>The database could not provide an active application cycle. Try again later or contact an organizer.</span><a href="/dashboard">Return to the dashboard</a></main>; }

/**
 * Turn the query string an action redirected with into a message.
 *
 * Server Actions cannot return a value across a redirect, so outcomes travel in
 * the URL. Mapping the codes to copy here — rather than putting the sentence in
 * the URL — keeps user-facing text out of link bars and browser history.
 */
function noticeFromQuery(query: { error?: string; success?: string }) {
  if (query.success === "submitted") return { tone: "success" as const, message: "Application submitted. Your answers are now locked." };
  if (query.success === "withdrawn") return { tone: "success" as const, message: "Application withdrawn. Organizers will no longer review it." };
  if (query.error === "incomplete") return { tone: "error" as const, message: "Complete every required answer before submitting." };
  if (query.error) return { tone: "error" as const, message: "That action did not finish. Your existing application is unchanged." };
  return undefined;
}

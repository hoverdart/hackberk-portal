import { CalendarDays, Heart, Laptop, MapPin, Scale, Users, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";

import { StatusStamp } from "@/components/ui/status-stamp";
import { ButtonLink } from "@/components/ui/button";
import {
  roleCopy,
  statusLabel,
  type ApplicationRole,
  type ApplicationSummary,
  type SectionProgress,
} from "@/lib/domain/applications";

/**
 * The portal shell — the signed-in surface at `/dashboard`.
 *
 * The binder metaphor is load-bearing rather than decorative: the role you are
 * working on is the top sheet, and the three you are not stay visible but
 * structurally queued behind it. That is why this is a layered deck and not a
 * grid of four equal cards — the layout itself says "one of these is your
 * current job".
 *
 * Every number on screen is derived from the applicant's stored answers. An
 * earlier version of this component printed a fixed four-row checklist with
 * invented statuses; the checklist below is the real section list for the role,
 * and each row links to that section of the wizard.
 *
 * A pure presentational component, shared with the visual fixture at
 * `/design/hero`, which is how the design and the production page stay in step.
 */

type PortalShellProps = {
  profileName: string;
  event: { name: string; venue: string; startsAt: string; closesAt: string; synthetic: boolean };
  applications: ApplicationSummary[];
  databaseAvailable?: boolean;
  activeRole?: ApplicationRole;
  /** Where the role tabs point. The design fixture switches roles on its own URL. */
  basePath?: string;
  preview?: boolean;
};

const roleIcons = { hacker: Laptop, judge: Scale, mentor: UserRoundCog, volunteer: Heart };

export function PortalShell({
  profileName,
  event,
  applications,
  databaseAvailable = true,
  activeRole = "hacker",
  basePath = "/dashboard",
  preview = false,
}: PortalShellProps) {
  const active = applications.find((application) => application.role === activeRole) ?? applications[0];
  // The selected role leads the deck; the rest keep their canonical order
  // behind it. Reordering here rather than in CSS keeps DOM order, tab order
  // and visual order identical, which is what a keyboard user follows.
  const others = applications.filter((application) => application.role !== activeRole);
  const deck = active ? [active, ...others] : applications;
  const eventDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(event.startsAt));
  const deadline = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(event.closesAt));

  return (
    <main className="dashboard-page">
      <header className="runbook-header">
        <h1>
          {greeting()}, {profileName}.
        </h1>
        <p>Apply for any of the four roles. Each one has its own form.</p>
      </header>

      {!databaseAvailable ? (
        <p className="database-notice" role="status">
          Live data is temporarily unavailable, so this shell is read-only. Drafts cannot be saved until the database
          reconnects.
        </p>
      ) : null}

      {/* The tabs are links, not buttons: switching role is a server render at a
          shareable URL, so `aria-selected` describes something real and the back
          button works. */}
      <div className="role-deck" role="tablist" aria-label="Application role">
        {deck.map((application) => {
          const Icon = roleIcons[application.role];
          const selected = application.role === activeRole;
          return (
            // Each tab keeps its own transition name, so re-ordering the deck
            // slides the tabs to their new slots instead of repainting the row.
            <ViewTransition key={application.role} name={`tab-${application.role}`} share="tab-move" default="none">
              <Link
                href={`${basePath}?role=${application.role}`}
                role="tab"
                aria-selected={selected}
                className={`role-tab role-tab--${application.role} ${selected ? "is-active" : ""}`}
              >
                <Icon aria-hidden />
                <strong>{application.role}</strong>
                <span>
                  {roleCopy[application.role].words.map((word) => (
                    <small key={word}>{word}</small>
                  ))}
                </span>
              </Link>
            </ViewTransition>
          );
        })}
      </div>

      {/* One element per role, re-ordered rather than re-created. Each keeps a
          single transition name for its whole life, so the browser morphs the
          chosen role up into the work slot while the previous one settles back
          into the queue. Rendering the active sheet and the queued sheets as
          separate elements sharing a name would mount two of the same name at
          once, which React rejects and the browser cannot animate. */}
      <section className="application-deck" aria-label={`${activeRole} application overview`}>
        {deck.map((application, position) => {
          const isActive = position === 0;
          return (
            <ViewTransition key={application.role} name={`sheet-${application.role}`} share="sheet-move" default="none">
              <article className={isActive ? "active-sheet" : `queued-sheet queued-sheet--${application.role}`}>
                {isActive ? (
                  <ActiveSheet application={application} event={event} eventDate={eventDate} />
                ) : (
                  <>
                    <strong className="queued-role">{capitalize(application.role)}</strong>
                    <StatusStamp status={application.status} />
                    <div
                      className="queued-progress"
                      aria-label={`${application.progress}% complete`}
                      style={{ "--progress": `${application.progress}%` } as CSSProperties}
                    >
                      <strong>{application.progress}%</strong>
                      <span />
                    </div>
                    {/* The tab above already brings this sheet to the front,
                        so the link on the sheet itself does the other useful
                        thing: it opens the form. */}
                    <Link href={`/applications/${application.role}`}>
                      {application.status === "not_started" ? "Start" : "Open"} application
                    </Link>
                  </>
                )}
              </article>
            </ViewTransition>
          );
        })}
      </section>

      <footer className="event-docket">
        <CalendarDays aria-hidden />
        <div>
          <small>Next event</small>
          <strong>{event.name}</strong>
        </div>
        <div>
          <small>Application deadline</small>
          <strong>{deadline} PT</strong>
        </div>
        <Users aria-hidden />
        <div>
          <small>Team matching</small>
          <strong>{preview ? "Open to you" : "Available once you’re accepted"}</strong>
        </div>
        <Link href="/ops">
          Event details <span aria-hidden>→</span>
        </Link>
      </footer>
    </main>
  );
}

/**
 * The contents of whichever sheet is currently on top of the deck.
 *
 * Separated from the deck loop only for readability — it renders *inside* the
 * same `<article>` element the queued sheets use, so the element itself (and
 * its view-transition name) survives a role change.
 */
function ActiveSheet({
  application,
  event,
  eventDate,
}: {
  application: ApplicationSummary;
  event: PortalShellProps["event"];
  eventDate: string;
}) {
  const role = application.role;
  const started = application.status !== "not_started";
  const locked = started && application.status !== "draft";
  return (
    <>
      <header className="active-sheet__header">
        <div className="sheet-title-row">
          <div>
            <h2>
              {capitalize(role)} application | {started ? statusLabel(application.status) : "Ready to Start"}
            </h2>
            <h3>{event.name}</h3>
          </div>
          <div className="progress-seal" style={{ "--progress": `${application.progress}%` } as CSSProperties}>
            <strong>{application.progress}%</strong>
            <span>complete</span>
          </div>
        </div>
        <dl className="event-facts">
          <div>
            <CalendarDays aria-hidden />
            <dt className="sr-only">Date</dt>
            <dd>{eventDate}</dd>
          </div>
          <div>
            <MapPin aria-hidden />
            <dt className="sr-only">Venue</dt>
            <dd>{event.venue}</dd>
          </div>
          <div>
            <Users aria-hidden />
            <dt className="sr-only">Format</dt>
            <dd>In person</dd>
          </div>
        </dl>
        <ButtonLink
          variant="primary"
          className="mobile-continue"
          href={`/applications/${role}`}
          trailing={<span aria-hidden>→</span>}
        >
          {applicationActionLabel(application.status)}
        </ButtonLink>
      </header>

      <div className="active-sheet__body">
        <div className="checklist-head">
          <span>STEP</span>
          <span>SECTION</span>
          <span>STATUS</span>
          <span />
        </div>
        {application.sections.map((section, index) => (
          <ChecklistRow key={section.key} index={index + 1} role={role} section={section} locked={locked} />
        ))}
        <div className="sheet-actions">
          <ButtonLink variant="primary" href={`/applications/${role}`} trailing={<span aria-hidden>→</span>}>
            {applicationActionLabel(application.status)}
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

/**
 * One row of the application checklist — one real section of the real form.
 *
 * Status is carried by the written label as well as by colour and a shaped
 * marker, so it survives both colour-blindness and a greyscale print. The link
 * carries `?section=`, which the wizard reads to open on that step.
 */
function ChecklistRow({
  index,
  role,
  section,
  locked,
}: {
  index: number;
  role: ApplicationRole;
  section: SectionProgress;
  locked: boolean;
}) {
  const status = locked ? "locked" : section.complete ? "complete" : "attention";
  const labels = { complete: "Complete", attention: "Needs answers", locked: "Locked" };
  return (
    <div className="checklist-row">
      <span>{index}.</span>
      <strong>{section.title}</strong>
      <span className={`checklist-status checklist-status--${status}`}>{labels[status]}</span>
      {locked ? (
        <span aria-hidden>—</span>
      ) : (
        <Link href={`/applications/${role}?section=${section.key}`}>
          {section.complete ? "Edit" : "Answer"}
          <span className="sr-only"> {section.title}</span>
        </Link>
      )}
    </div>
  );
}

/** Time-of-day greeting in the event's timezone, not the server's. */
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Good morning";
  return hour < 18 ? "Good afternoon" : "Good evening";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The dashboard must describe the action available for the actual workflow state. */
function applicationActionLabel(status: ApplicationSummary["status"]) {
  if (status === "not_started") return "Start application";
  if (status === "draft") return "Continue application";
  if (status === "submitted") return "View submitted application";
  if (status === "under_review") return "View review status";
  return "View application decision";
}

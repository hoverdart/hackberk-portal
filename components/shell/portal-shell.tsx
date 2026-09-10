import { BookOpen, CalendarDays, ChevronDown, CircleHelp, Folder, Heart, Laptop, LogOut, Mail, MapPin, Search, Scale, Users, UserRound, UserRoundCog } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";

import notes from "@/assets/plates/queued-sheet-notes.png";
import mascot from "@/assets/plates/tab-mascot.png";
import tower from "@/assets/plates/tower-illustration.png";
import { signOutAction } from "@/app/(public)/auth-actions";
import { StatusStamp } from "@/components/ui/status-stamp";
import { roleCopy, statusLabel, type ApplicationRole, type ApplicationSummary } from "@/lib/domain/applications";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * The portal shell — the signed-in surface at `/dashboard`.
 *
 * Presentational only: it receives everything it renders and performs no queries
 * and no authorization of its own. That is what lets the visual fixture at
 * `/design/hero` render the identical component with synthetic props, so design
 * work and the production page can never drift apart.
 */

type PortalShellProps = {
  profileName: string;
  event: { name: string; venue: string; startsAt: string; closesAt: string; synthetic: boolean };
  applications: ApplicationSummary[];
  databaseAvailable?: boolean;
  activeRole?: ApplicationRole;
  preview?: boolean;
};

// Rail destinations, in priority order. The 950px breakpoint keeps the first
// three and the 620px one keeps the first three as icons, so order is meaningful.
const navItems = [
  ["My applications", "/dashboard", Folder], ["Events", "/ops", CalendarDays], ["Opportunities", "/teams", Users],
  ["Resources", "/projects", BookOpen], ["Messages", "/ops#messages", Mail], ["Profile", "/dashboard#profile", UserRound],
] as const;
const roleIcons = { hacker: Laptop, judge: Scale, mentor: UserRoundCog, volunteer: Heart };

/** Shared application shell: the production page and visual fixture render the same component. */
export function PortalShell({ profileName, event, applications, databaseAvailable = true, activeRole = "hacker", preview = false }: PortalShellProps) {
  const active = applications.find((application) => application.role === activeRole) ?? applications[0];
  const eventDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" }).format(new Date(event.startsAt));
  const deadline = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }).format(new Date(event.closesAt));

  return (
    <main className="runbook-shell">
      <aside className="runbook-rail">
        <Wordmark href="/dashboard" />
        <nav aria-label="Primary navigation">
          {navItems.map(([label, href, Icon], index) => <Link key={label} href={href} aria-label={label} aria-current={index === 0 ? "page" : undefined} className={index === 0 ? "is-current" : undefined}><Icon aria-hidden size={21} /><span>{label}</span>{label === "Messages" ? <b>3</b> : null}</Link>)}
        </nav>
        <div className="runbook-rail-bottom"><Link href="/ops#support"><CircleHelp aria-hidden size={21} />Help & support</Link>{preview ? <Link href="/sign-in"><LogOut aria-hidden size={21} />Sign in</Link> : <form action={signOutAction}><button type="submit"><LogOut aria-hidden size={21} />Sign out</button></form>}</div>
        <Image src={tower} alt="Campanile line illustration" className="runbook-tower" priority />
        <p className="runbook-motto">BUILD<br />PEOPLE<br />IDEAS<br />A BRIGHTER<br />TOMORROW</p>
      </aside>

      <section className="runbook-stage">
        <header className="runbook-header">
          <div><h1>Good afternoon, {profileName}.</h1><p>Four ways to contribute. One bigger Herkeley.</p></div>
          <label className="runbook-search"><Search aria-hidden size={20} /><span className="sr-only">Search</span><input placeholder="Search events, resources, or help…" /></label>
          <button className="profile-menu" type="button" aria-label="Open account menu"><span>{initials(profileName)}</span><span><strong>{profileName}</strong><small>{preview ? "Undergraduate" : "Applicant"}</small></span><ChevronDown aria-hidden size={17} /></button>
        </header>
        {!databaseAvailable ? <p className="database-notice" role="status">Live data is temporarily unavailable. Showing the labeled synthetic event shell; drafts cannot be saved until Supabase reconnects.</p> : null}
        {preview ? <p className="preview-label">SYNTHETIC VISUAL FIXTURE</p> : null}

        <div className="role-deck" role="tablist" aria-label="Application role">
          <Image src={mascot} alt="" role="presentation" className="role-mascot" priority />
          {applications.map((application) => {
            const Icon = roleIcons[application.role];
            return <Link key={application.role} href={`/applications/${application.role}`} role="tab" aria-selected={application.role === activeRole} className={`role-tab role-tab--${application.role} ${application.role === activeRole ? "is-active" : ""}`}><Icon aria-hidden /><strong>{application.role}</strong><span>{roleCopy[application.role].words.map((word) => <small key={word}>{word}</small>)}</span></Link>;
          })}
        </div>

        {/* Naming the transition after the active role lets the browser tie the
            outgoing and incoming sheets together when the role changes, so the
            switch reads as one sheet being replaced rather than a full repaint. */}
        <ViewTransition name={`application-${activeRole}`}>
          <section className="application-deck" aria-label={`${activeRole} application overview`}>
            <article className="active-sheet">
              <header className="active-sheet__header">
                <div className="sheet-docket"><span>BACKATHONS AT HERKELEY</span><span>APPLICATION {preview ? "2026—01" : "2027—01"}</span></div>
                <div className="sheet-title-row"><div><h2>{capitalize(activeRole)} application — {preview ? "in progress" : active?.status === "not_started" ? "ready to start" : statusLabel(active?.status ?? "draft").toLowerCase()}</h2><h3>{event.name}</h3></div><div className="progress-seal" style={{ "--progress": `${active?.progress ?? 0}%` } as CSSProperties}><strong>{active?.progress ?? 0}%</strong><span>complete</span></div></div>
                <dl className="event-facts"><div><CalendarDays aria-hidden /><dt className="sr-only">Date</dt><dd>{eventDate}</dd></div><div><MapPin aria-hidden /><dt className="sr-only">Venue</dt><dd>{event.venue}</dd></div><div><Users aria-hidden /><dt className="sr-only">Format</dt><dd>In person</dd></div></dl>
                <Link className="mobile-continue primary-button" href={`/applications/${activeRole}`}>{active?.status === "not_started" ? "Start" : "Continue"} application <span aria-hidden>→</span></Link>
              </header>
              <div className="active-sheet__body">
                <div className="checklist-head"><span>STEP</span><span>DETAILS</span><span>STATUS</span><span /></div>
                <ChecklistRow index={1} title="Profile" subtitle="Basic info, education, links" details="Name, school, major, portfolio links" status="complete" />
                <ChecklistRow index={2} title="Experience" subtitle="Your background & interests" details="Previous hackathons, skills, areas of interest" status="complete" />
                <ChecklistRow index={3} title="Logistics" subtitle="Availability, travel, accommodation" details="Your attendance, housing needs, dietary needs" status="attention" />
                <ChecklistRow index={4} title="Final review" subtitle="Submit your application" details="Check your information and submit when ready" status="locked" />
                <div className="sheet-actions"><Link className="primary-button" href={`/applications/${activeRole}`}>{active?.status === "not_started" ? "Start" : "Continue"} application <span aria-hidden>→</span></Link><p><strong>Next: Complete your logistics information</strong><span>Your progress is saved automatically.</span></p></div>
                <footer className="sheet-footer"><span>GO BOLDER</span><span>BACKATHONS AT HERKELEY<br />EST. 2012</span><span>PEOPLE<br />IDEAS<br />COMMUNITY<br />IMPACT</span></footer>
              </div>
            </article>
            {/* The roles you are not currently working on stay visible but
                structurally queued behind the active sheet — the binder metaphor's
                central idea, and why this is not a grid of equal cards. */}
            <div className="queued-sheets" aria-label="Other role applications">
              {applications.filter((application) => application.role !== activeRole).map((application, index) => <article key={application.role} className={`queued-sheet queued-sheet--${application.role}`} style={{ "--sheet-index": index } as CSSProperties}><strong className="queued-role">{capitalize(application.role)}</strong><StatusStamp status={application.status} /><p>{roleCopy[application.role].tagline}</p><div className="queued-progress"><strong>{application.progress}%</strong><span /></div><Link href={`/applications/${application.role}`}>{application.status === "not_started" ? "Start" : "Open"} application</Link></article>)}
              <Image src={notes} alt="Handwritten notes: mentors multiply possibilities; different roles, a stronger community" className="queued-notes" />
            </div>
          </section>
        </ViewTransition>

        <footer className="event-docket"><CalendarDays aria-hidden /><div><small>Next event</small><strong>{event.name}</strong></div><div><small>Application deadline</small><strong>{deadline} PT</strong></div><Users aria-hidden /><div><small>Team matching</small><strong>{preview ? "You’re eligible" : "You’ll unlock it when accepted"}</strong></div><Link href="/ops">View event details <span aria-hidden>→</span></Link>{event.synthetic ? <span className="synthetic-label">SYNTHETIC DEMO</span> : null}</footer>
      </section>
    </main>
  );
}

/**
 * One row of the application checklist.
 *
 * Status is carried by the written label as well as by colour and a shaped
 * marker, so it survives both colour-blindness and a greyscale print.
 */
function ChecklistRow({ index, title, subtitle, details, status }: { index: number; title: string; subtitle: string; details: string; status: "complete" | "attention" | "locked" }) {
  const labels = { complete: "Complete", attention: "Needs attention", locked: "Locked" };
  return <div className="checklist-row"><span>{index}.</span><div><strong>{title}</strong><small>{subtitle}</small></div><p>{details}</p><span className={`checklist-status checklist-status--${status}`}>{labels[status]}</span><Link href="#">{status === "locked" ? "—" : status === "attention" ? "Review" : "Edit"}</Link></div>;
}
/** First letters of the first two words, for the avatar chip. */
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }

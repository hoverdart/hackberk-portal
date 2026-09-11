import { Heart, Laptop, Scale, UserRound, UserRoundCog } from "lucide-react";
import Link from "next/link";

import { getOrganizerMembership, requireUser } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/applications";
import {
  applicationRoles,
  statusLabel,
  type ApplicationRole,
  type ApplicationSummary,
} from "@/lib/domain/applications";
import { createClient } from "@/lib/supabase/server";

const roleIcons = { hacker: Laptop, judge: Scale, mentor: UserRoundCog, volunteer: Heart };

/**
 * The account sheet.
 *
 * Organizers and applicants share this route but not its contents. An organizer
 * cannot hold an application — the database rejects the write — so showing them
 * four roles with a "Start" link was an invitation to a dead end. They get their
 * staff membership instead, which is the thing their account actually is.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const organizer = await getOrganizerMembership();
  const supabase = await createClient();
  const [profileResult, event] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,preferred_name,school,graduation_year,pronouns,timezone")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveEvent(),
  ]);
  const profile = profileResult.data;
  const { data: applicationRows } =
    event && !organizer
      ? await supabase.from("applications").select("role,status").eq("event_id", event.id).eq("applicant_id", user.id)
      : { data: [] };
  const statuses = new Map(
    (applicationRows ?? []).map((application) => [
      application.role as ApplicationRole,
      application.status as ApplicationSummary["status"],
    ]),
  );
  const name = profile?.preferred_name || profile?.full_name || (organizer ? "Organizer" : "Applicant");
  const details = [
    ["Email", user.email || "Not available"],
    ["School", profile?.school || "Not added"],
    ["Graduation", profile?.graduation_year ? String(profile.graduation_year) : "Not added"],
    ["Pronouns", profile?.pronouns || "Not added"],
    ["Time zone", profile?.timezone || "Not added"],
  ];

  return (
    <main className="profile-page">
      <section className="profile-sheet">
        <header className="profile-sheet__header">
          <div className="profile-avatar">
            <UserRound aria-hidden />
          </div>
          <div>
            <h1>{name}</h1>
            <p>Account details</p>
          </div>
        </header>
        <dl className="profile-details">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {organizer ? (
          <section className="profile-roles" aria-labelledby="profile-roles-title">
            <h2 id="profile-roles-title">Organizer access</h2>
            <p>
              You review and decide applications for {event?.name ?? "this event"}. Organizer accounts cannot submit
              applications.
            </p>
          </section>
        ) : (
          <section className="profile-roles" aria-labelledby="profile-roles-title">
            <h2 id="profile-roles-title">Your applications</h2>
            <p>Each role has its own form and its own status.</p>
            <ul>
              {applicationRoles.map((role) => {
                const Icon = roleIcons[role];
                const status = statuses.get(role) ?? "not_started";
                return (
                  <li key={role} className={`role-divider role-divider--${role}`}>
                    <Icon aria-hidden />
                    <div>
                      <strong>{capitalize(role)}</strong>
                      <span>{statusLabel(status)}</span>
                    </div>
                    <Link href={`/applications/${role}`}>
                      {status === "not_started" ? "Start" : "Open"}
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </section>
    </main>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

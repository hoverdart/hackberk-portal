"use client";

import { BookOpen, CalendarDays, CircleHelp, Folder, LogOut, UserRound, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

import tower from "@/assets/plates/tower-illustration.png";
import { signOutAction } from "@/app/(public)/auth-actions";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * The one signed-in frame, shared by every participant and organizer route.
 *
 * This is the navy cover of the binder, and it is the only chrome: the rail
 * carries every destination, the account, and sign-out. There is deliberately
 * no second bar across the top — it duplicated links the rail already has and
 * cost every page a strip of vertical space.
 *
 * Every entry below is a route that exists. An earlier version of this rail
 * carried a search box that searched nothing and a "Messages" badge showing a
 * hardcoded 3; both are gone, because navigation that lies is worse than
 * navigation that is short.
 */

type PortalFrameProps = {
  children: ReactNode;
  /** Set by the `/design/hero` fixture, which renders the frame without a session. */
  preview?: boolean;
};

// `owns` lists the route subtrees an entry is responsible for, which is not
// always just its own href: the wizard lives at `/applications/:role` but
// belongs to Applications, whose link points at the dashboard.
const navigation = [
  { label: "Applications", href: "/dashboard", owns: ["/dashboard", "/applications"], Icon: Folder },
  { label: "Event", href: "/ops", owns: ["/ops", "/organizer"], Icon: CalendarDays },
  { label: "Teams", href: "/teams", owns: ["/teams"], Icon: Users },
  { label: "Projects", href: "/projects", owns: ["/projects"], Icon: BookOpen },
  { label: "Profile", href: "/profile", owns: ["/profile"], Icon: UserRound },
];

export function PortalFrame({ children, preview = false }: PortalFrameProps) {
  const pathname = usePathname();

  return (
    <div className="runbook-shell">
      <aside className="runbook-rail">
        <Wordmark href="/dashboard" />

        <nav aria-label="Primary navigation">
          {navigation.map(({ label, href, owns, Icon }) => {
            const current = preview ? href === "/dashboard" : owns.some((base) => isCurrent(pathname, base));
            return (
              <Link
                key={label}
                href={href}
                // The label span is hidden at narrow widths, where the rail is
                // icon-only. Without this the links would be unnamed there.
                aria-label={label}
                aria-current={current ? "page" : undefined}
                className={current ? "is-current" : undefined}
              >
                <Icon aria-hidden size={21} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="runbook-rail-bottom">
          <Link href="/ops#support">
            <CircleHelp aria-hidden size={21} />
            Help &amp; support
          </Link>
          {preview ? (
            <Link href="/sign-in">
              <LogOut aria-hidden size={21} />
              Sign in
            </Link>
          ) : (
            <form action={signOutAction}>
              <button type="submit">
                <LogOut aria-hidden size={21} />
                Sign out
              </button>
            </form>
          )}
        </div>

        <Image src={tower} alt="Campanile line illustration" className="runbook-tower" priority />
        <p className="runbook-motto">
          BUILD
          <br />
          PEOPLE
          <br />
          IDEAS
          <br />A BRIGHTER
          <br />
          TOMORROW
        </p>
      </aside>

      {/* One transition around the routed content, so moving between rail
          destinations is a settle rather than a hard swap. Surfaces that name
          their own transitions — the dashboard's role sheets — nest inside this
          one and take precedence over it. */}
      <section className="runbook-stage">
        <ViewTransition default="route-change">{children}</ViewTransition>
      </section>
    </div>
  );
}

/** True when the path is the base itself or sits underneath it. */
function isCurrent(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

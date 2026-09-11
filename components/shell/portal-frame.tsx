"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Folder,
  Heart,
  LifeBuoy,
  LogOut,
  Scale,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

import { signOutAction } from "@/app/(site)/(public)/auth-actions";
import { BrandRail } from "@/components/shell/brand-rail";

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
  /** Organizers get a focused rail rather than applicant destinations. */
  audience?: "applicant" | "organizer";
  /** Roles this account has been accepted for. Decides which entries appear. */
  roles?: string[];
};

// `owns` lists the route subtrees an entry is responsible for, which is not
// always just its own href: the wizard lives at `/applications/:role` but
// belongs to Applications, whose link points at the dashboard.
//
// `role` gates an entry on an accepted application. Everyone used to see all
// five destinations regardless of what they had been accepted for, so a judge
// carried a Teams tab they could never use and a volunteer carried Projects.
// An entry with no `role` is for everyone.
const applicantNavigation = [
  { label: "Applications", href: "/dashboard", owns: ["/dashboard", "/applications"], Icon: Folder },
  { label: "Event day", href: "/ops", owns: ["/ops"], Icon: CalendarDays },
  { label: "Teams", href: "/teams", owns: ["/teams"], Icon: Users, role: "hacker" },
  { label: "Projects", href: "/projects", owns: ["/projects"], Icon: BookOpen, role: "hacker" },
  { label: "Judging", href: "/judging", owns: ["/judging", "/projects"], Icon: Scale, role: "judge" },
  { label: "Help requests", href: "/ops#mentor", owns: [], Icon: LifeBuoy, role: "mentor" },
  { label: "Shifts", href: "/ops#volunteer", owns: [], Icon: Heart, role: "volunteer" },
  { label: "Profile", href: "/profile", owns: ["/profile"], Icon: UserRound },
];

const organizerNavigation = [
  {
    label: "Application queue",
    href: "/organizer/applications",
    owns: ["/organizer/applications"],
    Icon: ClipboardCheck,
  },
  { label: "Event operations", href: "/organizer/operations", owns: ["/organizer/operations"], Icon: CalendarDays },
  { label: "Profile", href: "/profile", owns: ["/profile"], Icon: UserRound },
];

export function PortalFrame({ children, preview = false, audience = "applicant", roles = [] }: PortalFrameProps) {
  const pathname = usePathname();
  const held = new Set(preview ? ["hacker"] : roles);
  const navigation =
    audience === "organizer"
      ? organizerNavigation
      : applicantNavigation.filter((entry) => !entry.role || held.has(entry.role));
  const homeHref = audience === "organizer" ? "/organizer/applications" : "/dashboard";

  return (
    <div className="app-shell">
      <BrandRail homeHref={homeHref}>
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

        <div className="app-rail-bottom">
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
      </BrandRail>

      {/* One transition around the routed content, so moving between rail
          destinations is a settle rather than a hard swap. Surfaces that name
          their own transitions — the dashboard's role sheets — nest inside this
          one and take precedence over it. */}
      <section className="app-stage">
        <ViewTransition default="route-change">{children}</ViewTransition>
      </section>
    </div>
  );
}

/** True when the path is the base itself or sits underneath it. */
function isCurrent(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

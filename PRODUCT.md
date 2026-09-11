# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16.3 App Router, React 19.2, Tailwind CSS 4, and hosted Supabase for PostgreSQL, Auth, and Row Level Security.

## Users

- Applicants use one account to submit distinct hacker, judge, mentor, and volunteer applications.
- Organizers assign, review, grade, and decide applications at high volume.
- Accepted judges evaluate submitted projects; mentors answer expertise-matched requests; volunteers follow assigned shifts and checklists.

## Product Purpose

Give Backathons at Herkeley one coherent operating system for the full path from application through event participation and project judging. Success means every role can understand its next action, organizers can make defensible decisions quickly, and authorization remains correct even when data is accessed outside the UI.

## Positioning

The same identity and event record changes shape by role: an applicant's submitted information becomes an organizer's blind review packet, an accepted hacker's team profile, and the foundation for project judging and event operations without fragmenting across tools.

## Operating Context

Applicants often complete forms between classes or on mobile. Organizers review large queues under deadline pressure. During an event, judges, mentors, and volunteers need concise, current work lists rather than broad dashboards.

## Capabilities and Constraints

- Multi-event schema with one seeded synthetic Backathons at Herkeley event.
- Immediate-session email/password authentication with cookie-based server rendering.
- Separate, versioned applications for hacker, judge, mentor, and volunteer roles.
- One organizer-owned blind review per application and explicit final decisions.
- Team matching is opt-in, explainable, invitation-based, and capped at four members.
- Project Lens supports public GitHub repositories only and never executes submitted code.
- Role Ops combines deadlines, judge assignments, mentor requests, and volunteer shifts.
- Hosted database credentials remain server-only; client authorization is enforced by grants and RLS.

## Brand Commitments

The product is for Backathons at Herkeley, a fictional organization. The name is a deliberate near-miss of a real one so this portal can never be mistaken for it; it is a portfolio build whose purpose is to demonstrate the engineering, and every surface says so. Preserve the primary blue, ink navy, Ddoski gold and brown, coral accents, and the established Space Grotesk, Karla, and Space Mono type lineage.

"Run of Show" is the name of the interface world only — an event operations binder expressed through role tabs, credential strips, review stamps, and queue sheets. It is not the product name and must not appear in user-facing copy.

## Evidence on Hand

The supplied project brief establishes the roles, visual palette, and workflow goals; the problem shape is drawn from how student hackathon organizations actually run, but the organization itself is invented. All event, applicant, review, team, project, and operations content shipped as seed data must be labeled synthetic; no attendance, acceptance, or impact claim may be invented, and nothing may imply affiliation with a real institution.

## Product Principles

1. Make the next action unmistakable.
2. Let reusable systems carry every role without flattening their differences.
3. Enforce trust in PostgreSQL, not only in interface visibility.
4. Explain matches, scores, and state changes.
5. Use motion to preserve orientation, never to delay work.

## Accessibility & Inclusion

Target WCAG 2.2 AA: complete keyboard operation, visible focus, semantic forms and tables, screen-reader status announcements, touch-safe controls, sufficient contrast, and reduced-motion behavior. Identity-sensitive information stays outside blind review packets, and accommodation answers are visible only to authorized organizers.

---
name: "Backathons at Herkeley Portal"
description: "A live event-operations binder that keeps every role oriented to its next cue."
colors:
  berkeley-blue: "#3d68bb"
  ink-navy: "#0a2457"
  paper: "#f6f7f3"
  paper-cool: "#e9eef2"
  paper-warm: "#efe3cc"
  ddoski-gold: "#ca841d"
  ddoski-brown: "#ab5e18"
  coral: "#e26d5a"
  success: "#237a57"
  danger: "#b23935"
  focus: "#ffd166"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(3rem, 7vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Encode Sans Semi Condensed, sans-serif"
    fontSize: "clamp(2rem, 2.6vw, 2.8rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Karla, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Space Mono, monospace"
    fontSize: "0.6rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  control: "3px"
  field: "4px"
  step: "5px"
  sheet: "5px 5px 8px 8px"
  tab: "9px 9px 0 0"
  round: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "30px"
  sheet: "42px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.berkeley-blue}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#2f5caa"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
    height: "44px"
  input-default:
    backgroundColor: "#fcfdfa"
    textColor: "{colors.ink-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "48px"
  nav-active:
    backgroundColor: "#245da9"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "0"
    padding: "0 24px"
    height: "48px"
  role-tab-hacker:
    backgroundColor: "#2a6ac6"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "7px 22px"
    height: "102px"
  role-tab-mentor:
    backgroundColor: "#e9d0a7"
    textColor: "#714018"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "7px 22px 7px 34px"
    height: "76px"
  card-active-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sheet}"
    padding: "30px 42px 24px"
  status-stamp-draft:
    backgroundColor: "transparent"
    textColor: "#9a6415"
    typography: "{typography.label}"
    rounded: "0"
    padding: "7px 10px"
  event-docket:
    backgroundColor: "#f9fbfc"
    textColor: "{colors.ink-navy}"
    typography: "{typography.body}"
    rounded: "0"
    padding: "10px 22px"
    height: "74px"
---

# Design System: Backathons at Herkeley Portal

## Overview

**Creative North Star: "The Live Run of Show Binder"**

The portal turns an event-operations binder into a working interface: a navy control rail frames cool paper sheets, role tabs expose the account's parallel responsibilities, and docket labels, ruled checklists, progress seals, and status stamps make state legible at a glance. It is operational and tactile, with the confidence of a staffed event desk rather than the neutrality of a generic software dashboard.

The visual hierarchy always answers three questions in order: which role is active, what work is active, and what comes next. Brand character comes from disciplined material cues, Berkeley blue and navy fields, Ddoski gold-brown warmth, restrained coral signals, compact operational type, and small pieces of commissioned line art. Expression never obscures status, authorization, or the primary action.

**Key Characteristics:**

- One dominant active work sheet with other role sheets visibly queued.
- Cool paper, ink rules, clipped credentials, circular seals, and stamped state language.
- Berkeley navy and blue structure warmed by Ddoski gold, brown, and restrained coral.
- Dense but calm operational typography with strong docket-level metadata.
- Purposeful motion that preserves orientation and disappears under reduced motion.
- Responsive transformation from layered desktop binder to ordered mobile work packet.

## Colors

The palette pairs institutional blue structure with cool paper neutrals and a small set of warm, role-specific signals.

### Primary

- **Berkeley Working Blue** (`berkeley-blue`, #3d68bb): active role fields, primary actions, progress, and selected controls.
- **Operations Ink Navy** (`ink-navy`, #0a2457): navigation rails, primary text, rules, and high-authority surfaces.

### Secondary

- **Ddoski Tab Gold** (`ddoski-gold`, #ca841d): warm brand emphasis and the Ddoski lineage.
- **Ddoski Binder Brown** (`ddoski-brown`, #ab5e18): warm ink, mentor context, and grounded secondary accents.

### Tertiary

- **Cue Coral** (`coral`, #e26d5a): synthetic-data labels, notifications, and rare attention cues.
- **Completion Green** (`success`, #237a57): completed and accepted states.
- **Exception Red** (`danger`, #b23935): rejected, withdrawn, invalid, and destructive states.
- **Keyboard Gold** (`focus`, #ffd166): the global high-contrast focus and selection signal.

### Neutral

- **Active Paper** (`paper`, #f6f7f3): the principal work sheet and form surface.
- **Cool Desk Paper** (`paper-cool`, #e9eef2): the page field behind layered sheets.
- **Warm Filing Paper** (`paper-warm`, #efe3cc): secondary binder material and queued role warmth.

### Named Rules

**The Working Blue Rule.** Berkeley blue marks the active responsibility or primary action; ink navy supplies the frame and authority around it.

**The Coral Is a Signal Rule.** Coral is rare and informationally meaningful, reserved for alerts, synthetic-data provenance, or a narrow accent edge rather than broad decoration.

**The Status Has Meaning Rule.** Success and danger colors communicate a state only when the same state is also written in text or carried by a recognizable symbol.

## Typography

**Display Font:** Space Grotesk (with `sans-serif` fallback)  
**Active-Sheet Headline Font:** Encode Sans Semi Condensed (with `sans-serif` fallback)  
**Body Font:** Karla (with `sans-serif` fallback)  
**Label/Mono Font:** Space Mono (with `monospace` fallback)

**Character:** Space Grotesk provides direct, human command language; Karla keeps dense operational copy approachable; Space Mono makes dockets, stamps, counts, and metadata feel accountable. Encode Sans Semi Condensed is reserved for the prominent active-sheet headline where a narrower silhouette protects the desktop composition.

### Hierarchy

- **Display** (700, `clamp(3rem, 7vw, 6rem)`, 0.92): landing and feature-page statements; use only where one message owns the viewport.
- **Headline** (700, `clamp(2rem, 2.6vw, 2.8rem)`, 1.05): the active work-sheet title and status phrase.
- **Title** (700, `1.35rem`, 1.1): shell greetings, panel titles, and operational section names.
- **Body** (400–600, `1rem`, 1.5): instructions, answers, field copy, and next-action explanations; keep explanatory reading measures around 62–72 characters.
- **Label** (700, `0.52rem–0.65rem`, `0.12em–0.20em`, uppercase): dockets, table headings, provenance labels, step counters, and compact status language.

### Named Rules

**The Docket Voice Rule.** Space Mono is metadata, not body copy: keep it short, usually uppercase, and visibly tracked.

**The Command Before Explanation Rule.** The Space Grotesk or condensed headline names the job; Karla immediately supplies the detail needed to complete it.

## Layout

Desktop surfaces use an explicit operating frame: a 210px navy rail, a 72px utility header, a staggered four-tab role deck, one wide active sheet, three narrow queued sheets, and a bottom event docket. The active/queued split is approximately two-thirds to one-third and the active sheet carries generous 42px horizontal insets while dense list rows preserve a ruled rhythm. Feature, review, and application surfaces reuse the same navy-to-paper relationship even when their working grids differ.

At 950px, the persistent rail becomes a compact top navigation strip, the active and queued areas become one column, and the event docket rejoins document flow. At 620px, the role tabs become an equal four-item selector, the primary action moves into the active-sheet header as well as the task end, checklist rows reorganize around title, status, detail, and action, and queued sheets become a vertical sequence with their role labels restored. The mobile system unfolds the binder in priority order; it never merely shrinks the desktop layering.

Touch targets are at least 44px where interaction density permits, content grids use `minmax(0, 1fr)` to prevent overflow, and horizontal scrolling is limited to intrinsically tabular data. Keep active actions above the fold where the operating context allows.

### Named Rules

**The One Active Sheet Rule.** One role and one next action dominate; other responsibilities remain visible but structurally queued.

**The Unfold, Do Not Shrink Rule.** Mobile preserves role, task, evidence, and next cue by changing order and topology rather than scaling down desktop geometry.

## Elevation & Depth

Depth is structural: paper sheets cast cool navy-tinted shadows, staggered tabs sit at different heights, queued sheets translate by small fixed offsets, and a low-opacity fiber texture distinguishes paper from the cool desk field. Flat rules and tonal changes handle most internal hierarchy; shadows are reserved for sheet separation, active controls, the rail, dialogs, and stateful hover.

### Shadow Vocabulary

- **Active sheet** (`0 18px 42px rgb(10 36 87 / 18%)`): the principal work surface and forms.
- **Queued sheet** (`0 12px 28px rgb(10 36 87 / 12%)`): secondary role sheets that remain available but recede.
- **Control rest** (`0 9px 20px rgb(30 83 171 / 18%)`): the primary button at rest.
- **Control hover** (`0 12px 24px rgb(30 83 171 / 24%)`): a restrained lift that confirms interactivity.
- **Modal sheet** (`0 30px 90px rgb(0 12 35 / 35%)`): the confirmation sheet above the navy veil.

### Named Rules

**The Paper Stack Rule.** Elevation explains which sheet is active or temporarily above the work; it is never ambient decoration.

**The Texture at Whisper Volume Rule.** Paper fiber stays low-opacity and never competes with text, controls, or thin rules.

## Shapes

The system is cut and filed rather than pill-shaped. Buttons and fields use tight 3–4px corners; work sheets soften only at their outer corners; role tabs use rounded top corners and clipped leading edges; tables and dockets remain rectangular. Full circles are reserved for progress seals, status markers, step numbers, avatars, and notification counts where their silhouette carries meaning.

Borders are thin, cool blue-gray, and functional. Docket rules, checklist dividers, tab seams, and field strokes organize dense information without creating a grid of unrelated boxes. Status stamps intentionally rotate a few degrees to contrast accountable state with the otherwise precise layout.

### Named Rules

**The Cut, Not Bubble Rule.** Use small radii for controls and sheets; use a full circle only for a seal, marker, avatar, or count.

**The Rule Carries Structure Rule.** Prefer one meaningful divider or clipped edge to another rounded container.

## Components

### Buttons

- **Shape:** compact rectangular control with a slight radius (`3px`) and a minimum touch height of `44px`.
- **Primary:** Berkeley Working Blue with white text, strong Karla weight, and `0.75rem 1.5rem` padding; use for the single next action in a work area.
- **Hover / Focus:** lift by `1px`, deepen the blue and shadow over `180ms`; the global visible focus outline is `3px` Keyboard Gold with a `3px` offset.
- **Secondary / Ghost:** transparent with an ink or blue-gray stroke; destructive variants use Exception Red in both text and border.
- **Disabled:** lower opacity, remove lift and shadow, and retain the written label.

### Chips

- **Style:** selectable choices are tight paper rectangles with a cool blue-gray stroke, 3px corners, and at least 44px height rather than pills.
- **State:** selection shifts to a pale blue paper field with a stronger Berkeley-blue border, blue ink, and bold text; native checkbox state remains present.

### Cards / Containers

- **Corner Style:** work sheets use subtly varied outer corners (`5px 5px 8px 8px`); supporting sheets and tables stay nearly square.
- **Background:** Active Paper over Cool Desk Paper, with warm filing paper reserved for role context.
- **Shadow Strategy:** follow the Paper Stack Rule; the active surface carries the strongest resting shadow.
- **Border:** thin blue-gray rules mark sheet headers, rows, dockets, and secondary edges.
- **Internal Padding:** active desktop sheets use about `42px`; supporting modules commonly use `18–30px`; mobile work areas reduce to `18–20px`.

### Inputs / Fields

- **Style:** near-white paper fill, cool blue-gray 1px stroke, 3px corners, Karla text, and a 48px minimum height.
- **Focus:** shift the border to blue and add a restrained 3px blue halo while preserving the global Keyboard Gold focus indication for keyboard users.
- **Error / Disabled:** Exception Red changes the stroke and error copy; disabled field groups recede in opacity without hiding their values.

### Navigation

- **Style:** a deep navy rail with 48px rows, light ink, line icons, and Karla labels; the active row gains a brighter blue field and a 5px light-blue registration bar.
- **Hover / Active:** hover introduces an 8% white wash; active state remains visible without hover and is reinforced by `aria-current`.
- **Mobile:** collapse to a short top mast that retains the wordmark and highest-priority destinations as 44px-safe icon controls.

### Role Tabs

Role tabs are the signature orientation control. The active hacker tab rises to `102px` in saturated Berkeley blue; queued roles step down through warm paper and coral materials, use clipped leading edges, and expose their icon, role name, and three-word operational purpose. On mobile all four become equal-height, fully labeled tabs so role choice remains explicit without the desktop overlap.

### Status Stamps and Progress Seals

Stamps use a 2px current-color border, Space Mono, uppercase text, and a restrained `-8deg` rotation. Progress uses a circular conic seal with the numeric value at center; checklist states pair a written status with a shaped or symbolic marker. Never rely on color alone.

### Event Docket

The footer docket is a compact, ruled strip for the next event, deadline, team state, detail link, and synthetic-data provenance. It stays fixed to the bottom of the desktop stage when space permits and becomes an in-flow, vertically grouped record on mobile.

## Do's and Don'ts

### Do:

- **Do** preserve one unmistakable primary action within the active work sheet.
- **Do** keep role context visible through tabs or explicit mobile role labels while another role is active.
- **Do** use cool paper, thin ink rules, docket labels, and restrained structural shadows as one coherent material system.
- **Do** pair every colored status with text or a recognizable symbol and retain the 3px Keyboard Gold focus outline.
- **Do** transform desktop layering into an ordered mobile work packet at the established 950px and 620px breakpoints.
- **Do** label all synthetic event data with persistent coral provenance language.

### Don't:

- **Don't** replace the binder topology with a generic floating-card dashboard grid.
- **Don't** use glassmorphism, gradient meshes, neon accents, decorative analytics charts, or excessive rounding.
- **Don't** let the mascot, paper texture, handwriting, or line art obscure live data or controls.
- **Don't** use coral as a broad background or decoration; it is a scarce signal.
- **Don't** communicate application, review, or system state through color alone.
- **Don't** shrink desktop sheets until their content becomes unreadable; reorder and restack them instead.

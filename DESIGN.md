---
name: "Backathons at Herkeley Portal"
description: "An event operations portal that keeps every role oriented to its next action."
colors:
  berkeley-blue: "#3d68bb"
  primary-hover: "#2f5caa"
  ink-navy: "#0a2457"
  navy-rail-from: "#082856"
  navy-rail-to: "#07376f"
  rail-current: "#245da9"
  rail-current-edge: "#62a2ff"
  paper: "#f6f7f3"
  paper-cool: "#e9eef2"
  paper-warm: "#efe3cc"
  paper-white: "#fcfdfa"
  surface-0: "#f0f4f6"
  surface-2: "#f8faf9"
  surface-3: "#e6ebee"
  ddoski-gold: "#ca841d"
  ddoski-brown: "#ab5e18"
  coral: "#e26d5a"
  success: "#237a57"
  success-ink: "#146b5f"
  danger: "#b23935"
  danger-ink: "#8d332c"
  danger-border: "#a6443d"
  danger-tint: "#f8ebe9"
  warn-ink: "#9a6415"
  warn-mark: "#cf900d"
  focus: "#ffd166"
  link: "#1b5db8"
  link-strong: "#174d94"
  ink-2: "#3d5878"
  ink-3: "#456785"
  ink-4: "#4f6b88"
  ink-on-navy: "#dbe8fa"
  ink-on-navy-2: "#9fbde2"
  rule: "#9aaec6"
  rule-hair: "#c4cfd8"
  rule-strong: "#8095ad"
  selected-bg: "#2869c3"
  selected-border: "#2363bb"
  field-focus: "#296fd6"
  tint-blue: "#e8f0fc"
  track: "#dce3ea"
  role-hacker: "#2a6ac6"
  role-hacker-tint: "#dce7f7"
  role-judge-tint: "#f4ede0"
  role-mentor-tint: "#e9d0a7"
  role-volunteer-tint: "#f2c6bd"
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
components:
  button-primary:
    backgroundColor: "{colors.berkeley-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.7rem 1.4rem"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    borderColor: "{colors.ink-4}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.control}"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.link}"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    borderColor: "{colors.danger-border}"
    textColor: "{colors.danger-ink}"
    height: "44px"
  input-default:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "48px"
  eyebrow:
    textColor: "{colors.ink-3}"
    fontSize: "0.6rem"
    letterSpacing: "0.18em"
  nav-active:
    backgroundColor: "{colors.rail-current}"
    textColor: "#ffffff"
    rounded: "0"
    padding: "0 24px"
    height: "48px"
  card-active-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sheet}"
    padding: "30px 42px 24px"
  status-stamp-draft:
    backgroundColor: "transparent"
    textColor: "{colors.warn-ink}"
    typography: "{typography.label}"
    padding: "7px 10px"
---

# Design System: Backathons at Herkeley Portal

## Overview

**Creative North Star: "The Live Run of Show Binder"**

The portal turns an event-operations binder into a working interface: a navy control rail frames cool paper sheets, role tabs expose the account's parallel responsibilities, and ruled checklists, progress seals, and status stamps make state legible at a glance. The metaphor names the materials, never the product: see **Voice**. It is operational and tactile, with the confidence of a staffed event desk rather than the neutrality of a generic software dashboard.

The visual hierarchy always answers three questions in order: which role is active, what work is active, and what comes next. Brand character comes from disciplined material cues, Berkeley blue and navy fields, Ddoski gold-brown warmth, restrained coral signals, compact operational type, and small pieces of commissioned line art. Expression never obscures status, authorization, or the primary action.

**Key Characteristics:**

- One dominant active work sheet with other role sheets visibly queued.
- Cool paper, ink rules, circular seals, and stamped state language.
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

### Supporting Ink

Body and secondary copy on paper use a three-step ink ramp rather than a bespoke
value per component. Every step clears WCAG AA (4.5:1) against Active Paper, Cool
Desk Paper, the header wash, and white, so any of them may be used on any paper
surface without re-checking.

- **Strong secondary** (`ink-2`, #3d5878, 6.81:1 on paper): lede copy, labels, and
  emphasis inside supporting text.
- **Default supporting** (`ink-3`, #456785, 5.53:1): the ordinary explanatory voice.
- **Softest permitted** (`ink-4`, #4f6b88, 5.15:1): metadata, captions, placeholders.
  Nothing lighter than this carries text.

Structure uses two cool blue-grey steps: **Rule** (`rule`, #9aaec6) for a visible
divider such as a sheet header or section boundary, and **Hairline** (`rule-hair`,
#c4cfd8) for checklist dividers and table rows. **Paper White** (`paper-white`,
#fcfdfa) is the field fill for inputs and inset panels on paper.

### Named Rules

**The Every Colour Is Named Rule.** No hex literal appears outside
`app/styles/tokens.css`, except `#ffffff` where a token would only ever mean white. This is the rule the system most recently failed: the
stylesheet declared seventeen tokens and then carried about a hundred and sixty
literal values across a hundred and thirty-six distinct colours. The navy rail
was not `--ink-navy`. The link blue was written fourteen different ways. The same
cool blue-grey divider appeared under eighteen spellings while `--rule` and
`--rule-hair` sat unused. If a colour needs to exist, it needs a name, and giving
it one forces its role to be decided rather than approximated.

**The Ink Ramp Rule.** Supporting text picks a step from the ramp; it never
introduces a new mid-tone. The ramp exists because the same semantic role was once
written fifty different ways, twenty-three of which failed AA on cool paper.

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
  Small text uses four steps — `--text-xs` .72rem, `--text-sm` .82rem, `--text-md`
  .95rem, `--text-lg` 1.1rem — rather than a bespoke size per component. Display
  sizes stay literal per surface, because those are composition decisions rather
  than a ramp.

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

Everything in this section lives in `components/ui/`. The governing rule came out
of a real failure and is worth stating before the parts:

**The Containers Own Layout, Components Own Appearance Rule.** A page may set a
component's `display`, `gap`, `justify-content` or margin. It may never set its
colour, border, radius or type. Before this rule there were eight unrelated
button treatments, most of them defined by an ancestor selector — and
`.rubric-actions button { background: transparent }` at specificity (0,1,1)
silently outranked `.primary-button { background: blue }` at (0,1,0), while
`.rubric-actions .primary-button { color: white }` at (0,2,0) won the colour.
The primary action of the review screen rendered as white text on pale paper.
Keying variants on the control itself keeps every rule flat, so a container
cannot win that fight again.

### Buttons — `Button`, `ButtonLink`

- **Shape:** a compact rectangle at `3px` radius with a `44px` minimum height
  (`40px` at `size="sm"`).
- **Primary:** Berkeley Working Blue on white, for the single next action in a
  work area. Hover lifts 1px and deepens to `primary-hover`.
- **Secondary:** transparent with an `ink-4` stroke; hover takes `tint-blue`.
- **Ghost:** no stroke, `link` text. For a navigation that is not the main action.
- **Danger:** `danger-border` stroke and `danger-ink` text, for withdraw, recuse
  and reject.
- **Retinting:** a surface that genuinely needs another colour sets `--btn-bg`,
  `--btn-fg` or `--btn-border` on itself rather than adding a variant.
- **Disabled:** half opacity, no lift, no shadow, and the written label stays.
- `ButtonLink` is the same control when the action is a navigation, so a link
  never has to impersonate a button.

### Sheet headers — `SheetHeader`, `Eyebrow`

One icon treatment: flex, vertically centred, `10px` gap, the glyph fixed at
`24px`. There used to be three, and the most common one was
`<h2><Icon /> Title</h2>` with no alignment at all — which renders the icon as an
inline replaced element sitting on the text baseline, so its bottom edge lines up
with the bottom of the letters while the cap-height floats well above it.

`Eyebrow` is the small tracked label, at one size (`0.6rem`) and one tracking
(`0.18em`). **The Eyebrow Must Earn Its Line Rule:** use it only when it says
something the heading does not. Fifty-one of these were once written by hand
across eighteen positional selectors, nearly all of them decoration above a
heading that already read clearly; most were deleted rather than converted.

### Dialogs — `Dialog`

`role="dialog"`, `aria-modal`, a focus trap, Escape to dismiss, and focus
returned to the control that opened it. Focus lands on the dismissing button, not
the confirming one, so a stray Return cancels rather than commits.

### Fields and chips

- **Fields:** near-white fill, cool blue-grey stroke, `3px` corners, `48px`
  minimum height. Focus shifts the border to `field-focus` with a restrained 3px
  halo while keeping the global Keyboard Gold ring for keyboard users.
- **Chips:** tight paper rectangles rather than pills, at least 44px high.
  Selection takes `tint-blue` with a `selected-border` stroke and bold text; the
  native checkbox state remains present.

### Feeds and message sheets

`ActionFeed` renders every queue in the product — deadlines, judging, help
requests, shifts, submitted projects, the audit trail — as a marker, a title, a
detail and at most one action, so no two queues drift into two different lists.
`MessageSheet` is the single-message surface for empty states and dead ends.
Both require their empty copy rather than accepting a blank panel.

### Navigation

A deep navy rail with 48px rows, light ink and Karla labels; the active row takes
`rail-current` with a 5px `rail-current-edge` registration bar and `aria-current`.
**The rail shows only what the account can actually do:** destinations are gated
on the roles a person has been accepted for, so a judge does not carry a Teams
tab they can never use. It collapses to a 64px top mast at 950px.

### Role tabs, stamps and seals

Role tabs are the dashboard's orientation control: the active role rises to
`102px` in saturated blue and the queued roles step down through the warm role
tints with clipped leading edges. Status stamps use a 2px current-colour border,
Space Mono, uppercase and a `-8deg` rotation. Progress is a conic seal with the
value at centre. Never rely on colour alone — every one of these pairs its colour
with words.

## Motion

**The Arrival Budget Rule.** Nothing may be invisible for longer than it takes to
read as arrival. No entrance on routed content starts later than ~220ms, and the
whole choreography finishes inside ~550ms.

A budget, not a ban. The motion is the point — paper is dealt onto a desk, tabs
seat into their slots, a stamp presses last — and the flash this rule exists to
prevent was never caused by the animation, only by its schedule. Entrances used
to start at `opacity: 0` with `animation-fill-mode: both` and delays running out
to 760ms, attached to content that remounts on every navigation, so the stage was
genuinely blank for most of a second after every click.

One exemption and one prohibition. Dialogs keep their entrance, because they are
genuinely on-demand mounts. The rail takes none at all — it is furniture, and
furniture does not arrive; it had a wipe, and the wipe replayed every time a
signed-out navigation rebuilt it. The Campanile inside it keeps its draw, because
that mark is the point of the rail rather than its arrival.

One exclusion. `.review-workspace` takes no arrival animation at all: recording a
decision redirects to the same route, so an entrance there replays on a page the
organizer is already looking at — which is what made its header appear to pop up
at random.

`--motion-shift` scales every distance and reduced motion sets it to `0`, which
keeps state changes while removing all travel.

## Voice

**The Name The Job Rule.** Copy says what the reader is doing. The interface
world is called a run-of-show binder in this document and nowhere else: `docket`,
`desk`, `runbook`, `credential`, `control` and `handoff` are vocabulary for
describing the design, and every one of them had leaked into product copy — the
sign-in page was once headed "Open your runbook". Schema words leak the same way;
"records", "capacity and ownership" and "deterministic" are not things a reader
is doing either.

Corollaries: an empty state says what would appear here and why it has not;
an error says what did not happen and what is still intact; nothing invents
institutional detail, which is why a fabricated founding year and three invented
mottos were deleted from a product that states elsewhere that the organisation is
fictional.

## Do's and Don'ts

### Do:

- **Do** preserve one unmistakable primary action within the active work sheet.
- **Do** name every colour in `app/styles/tokens.css` before using it.
- **Do** let containers set layout and components set appearance.
- **Do** show a person only the destinations their accepted roles actually reach.
- **Do** pair every coloured status with text or a recognizable symbol, and keep
  the 3px Keyboard Gold focus outline.
- **Do** write copy that names the reader's job.
- **Do** transform desktop layering into an ordered mobile work packet at the
  established 950px and 620px breakpoints.
- **Do** label synthetic event data as sample data.

### Don't:

- **Don't** write a hex literal outside the token file.
- **Don't** style a control from its container — that is how a primary button
  became invisible.
- **Don't** let an entrance on routed content start later than ~220ms.
- **Don't** add an eyebrow above a heading that already reads clearly.
- **Don't** let this document's vocabulary — binder, docket, sheet, stamp —
  appear in user-facing copy.
- **Don't** use glassmorphism, gradient meshes, neon accents, decorative
  analytics charts, or excessive rounding.
- **Don't** use coral as a broad background or decoration; it is a scarce signal.
- **Don't** communicate application, review, or system state through colour alone.
- **Don't** invent institutional detail — founding years, mottos, counts.
- **Don't** shrink desktop sheets until their content becomes unreadable; reorder
  and restack them instead.

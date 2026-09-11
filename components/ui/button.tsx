import Link from "next/link";
import type { ComponentProps, ComponentPropsWithRef, ReactNode } from "react";

/**
 * The one button.
 *
 * There used to be eight unrelated treatments: `.primary-button`, six one-off
 * classes, and about fifteen bare `<button>`s whose entire appearance came from
 * an ancestor rule like `.rubric-actions button` or `.decision-bar button`.
 * Styling a control by its container is what produced the bug this component
 * exists to prevent — `.rubric-actions button { background: transparent }` is
 * specificity (0,1,1) and outranked `.primary-button { background: blue }` at
 * (0,1,0), while `.rubric-actions .primary-button { color: white }` at (0,2,0)
 * won the colour. "Submit review" rendered as white text on pale paper: the
 * primary action of the whole review screen, invisible.
 *
 * So appearance lives here and only here, keyed on a variant class, which keeps
 * every rule at a flat (0,1,1). Containers may set layout — `display`, `gap`,
 * `justify-content` — and nothing else. A surface that needs a different colour
 * sets `--btn-bg` / `--btn-fg` / `--btn-border` on itself rather than growing a
 * new variant.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type Shared = {
  variant?: Variant;
  size?: Size;
  /** Stretch to the container's width, for stacked mobile actions. */
  full?: boolean;
  /** Leading glyph. Sized by CSS so icon buttons cannot drift apart. */
  icon?: ReactNode;
  /** Trailing glyph — the arrow that nudges on hover. */
  trailing?: ReactNode;
};

export function buttonClass({ variant = "secondary", size = "md", full = false }: Shared = {}) {
  return `btn btn--${variant} btn--${size}${full ? " btn--full" : ""}`;
}

/**
 * `buttonClass` is exported for the few places that must stay a raw element —
 * a `<button>` inside a `<form action={…}>` that a parent Server Component
 * owns, for instance.
 */
export function Button({
  variant,
  size,
  full,
  icon,
  trailing,
  children,
  className,
  ...props
}: Shared & ComponentPropsWithRef<"button">) {
  return (
    <button className={`${buttonClass({ variant, size, full })}${className ? ` ${className}` : ""}`} {...props}>
      {icon}
      {children}
      {trailing}
    </button>
  );
}

/** The same control when the action is a navigation rather than a submission. */
export function ButtonLink({
  variant,
  size,
  full,
  icon,
  trailing,
  children,
  className,
  ...props
}: Shared & ComponentProps<typeof Link>) {
  return (
    <Link className={`${buttonClass({ variant, size, full })}${className ? ` ${className}` : ""}`} {...props}>
      {icon}
      {children}
      {trailing}
    </Link>
  );
}

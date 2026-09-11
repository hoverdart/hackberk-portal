"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import { Button } from "@/components/ui/button";

/**
 * The modal confirmation sheet.
 *
 * Lifted out of the application wizard, which was the only place that had built
 * one properly. The organizer's conflict-of-interest dialog was a bare `<div>`
 * with a mousedown handler — no `role="dialog"`, no `aria-modal`, no focus trap,
 * no Escape key, no focus return — while four hundred lines away sat a complete
 * implementation of all five. Both now render this.
 *
 * Focus moves to the dismissing control on open rather than the confirming one,
 * so a stray Return keypress cancels instead of committing. `returnFocusRef` is
 * optional because not every opener is a ref'd button, but pass it when you have
 * one: returning focus to where it came from is what makes a keyboard user's
 * position survive the dialog.
 */
export function Dialog({
  title,
  description,
  cancelLabel = "Cancel",
  onClose,
  returnFocusRef,
  eyebrow,
  children,
}: {
  title: string;
  description?: string;
  cancelLabel?: string;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Only when it names something the title does not. */
  eyebrow?: string;
  /** The confirming action — a form, a button, whatever commits. */
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const returnFocus = returnFocusRef?.current;
    return () => returnFocus?.focus();
  }, [returnFocusRef]);

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? `${titleId}-description` : undefined}
        className="confirmation-dialog"
        onKeyDown={trapFocus}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={titleId}>{title}</h2>
        {description ? <span id={`${titleId}-description`}>{description}</span> : null}
        <div className="dialog-actions">
          <Button ref={cancelRef} variant="ghost" type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
          {children}
        </div>
      </section>
    </div>
  );
}

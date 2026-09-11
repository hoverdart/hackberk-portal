import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

describe("Button", () => {
  /**
   * The regression this component exists for. `.rubric-actions button` set
   * `background: transparent` at specificity (0,1,1) and beat
   * `.primary-button { background: blue }` at (0,1,0), while
   * `.rubric-actions .primary-button { color: white }` at (0,2,0) won the
   * colour — so the review screen's primary action rendered as white text on
   * pale paper. Variants are a class on the control itself now, which is what
   * keeps a container from being able to repaint it.
   */
  it("carries its variant on the control rather than inheriting from a container", () => {
    render(
      <div className="rubric-actions">
        <Button variant="primary">Submit review</Button>
      </div>,
    );
    expect(screen.getByRole("button", { name: "Submit review" })).toHaveClass("btn", "btn--primary");
  });

  it("defaults to the secondary variant so an unlabelled button is never mistaken for the primary action", () => {
    expect(buttonClass()).toBe("btn btn--secondary btn--md");
    expect(buttonClass({ variant: "danger", size: "sm", full: true })).toBe("btn btn--danger btn--sm btn--full");
  });

  it("renders a navigation as a link and a submission as a button", () => {
    render(
      <>
        <ButtonLink variant="primary" href="/sign-up">
          Apply
        </ButtonLink>
        <Button variant="primary" type="submit">
          Save
        </Button>
      </>,
    );
    expect(screen.getByRole("link", { name: "Apply" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  it("forwards a ref, which the dialog needs to return focus to its opener", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Open</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Open" }));
  });
});

describe("Dialog", () => {
  function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
    return (
      <Dialog title="Report a conflict" description="Hands it back to the queue." onClose={onClose}>
        <button type="submit">Report conflict</button>
      </Dialog>
    );
  }

  it("announces itself as a modal dialog labelled by its own title", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Report a conflict");
    expect(dialog).toHaveAccessibleDescription("Hands it back to the queue.");
  });

  it("focuses the dismissing control, so a stray Return cancels rather than commits", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("traps Tab inside itself, so a keyboard user cannot land behind the veil", async () => {
    render(<Harness />);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Report conflict" });
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("returns focus to the control that opened it", async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      const trigger = useRef<HTMLButtonElement>(null);
      return (
        <>
          <Button ref={trigger} onClick={() => setOpen(true)}>
            Report conflict
          </Button>
          {open ? (
            <Dialog title="Report a conflict" onClose={() => setOpen(false)} returnFocusRef={trigger}>
              <button type="submit">Confirm</button>
            </Dialog>
          ) : null}
        </>
      );
    }
    render(<Opener />);
    const trigger = screen.getByRole("button", { name: "Report conflict" });
    await userEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});

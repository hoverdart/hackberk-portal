import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural checks on the authored stylesheets.
 *
 * These exist because a refactor silently ate two declarations. A helper
 * rewrote rules by matching a selector as a literal string, and
 * `.request-composer` is a substring of `.action-feed, .request-composer { … }`
 * — so it removed the declaration block from the middle of a selector list and
 * left `.action-feed, .request-composer,` dangling, which CSS then read as the
 * opening of the *next* rule.
 *
 * The result compiled, passed lint, passed every other test, and shipped: the
 * feed panels lost their padding, so their headings sat flush against an
 * `overflow: hidden` edge and were sliced through the ascenders. Nothing in the
 * pipeline could see it, because a merged rule is still perfectly valid CSS.
 *
 * The check that matters is therefore not "is this parseable" but "does the
 * declaration that keeps text off a clipping edge still exist, at the top level,
 * where it applies at every width".
 */

type Rule = { selectors: string[]; body: string; inAtRule: boolean };

function parse(css: string): Rule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  let depth = 0;
  let buffer = "";
  let prelude = "";
  const preludeStack: string[] = [];
  for (const char of withoutComments) {
    if (char === "{") {
      depth += 1;
      if (depth === 1) {
        prelude = buffer.trim();
        preludeStack.push(prelude);
        buffer = "";
        continue;
      }
      if (depth === 2) {
        prelude = buffer.trim();
        buffer = "";
        continue;
      }
    }
    if (char === "}") {
      const closingPrelude = depth === 1 ? preludeStack.pop() : prelude;
      if (closingPrelude && !closingPrelude.startsWith("@")) {
        rules.push({
          selectors: closingPrelude.split(",").map((selector) => selector.trim()),
          body: buffer,
          inAtRule: depth > 1,
        });
      }
      depth -= 1;
      buffer = "";
      prelude = depth === 1 ? (preludeStack.at(-1) ?? "") : "";
      continue;
    }
    buffer += char;
  }
  return rules;
}

const dir = path.join(process.cwd(), "app", "styles");
const files = readdirSync(dir).filter((file) => file.endsWith(".css"));
const rules = files.flatMap((file) => parse(readFileSync(path.join(dir, file), "utf8")));

describe("authored stylesheets", () => {
  it("parses a substantial number of rules, so the checks below mean something", () => {
    expect(files.length).toBeGreaterThan(5);
    expect(rules.length).toBeGreaterThan(200);
  });

  it("has no rule with a blank entry in its selector list", () => {
    const blank = rules.filter((rule) => rule.selectors.some((selector) => selector === ""));
    expect(blank.map((rule) => rule.selectors.join(","))).toEqual([]);
  });

  /**
   * Each of these is a card with `overflow: hidden`. Zero padding does not
   * merely look tight — it slices the first line of text. The rule must be a
   * top-level one: an override inside a breakpoint does not keep the heading off
   * the edge at every other width, which is exactly how the regression hid.
   */
  it.each([
    ".action-feed",
    ".request-composer",
    ".current-team",
    ".create-team",
    ".matching-sheet",
    ".invitations",
    ".match-list",
    ".project-intake",
  ])("gives %s its own padding at the top level", (panel) => {
    const declaring = rules.filter(
      (rule) => !rule.inAtRule && rule.selectors.includes(panel) && /(^|;|\s)padding\s*:/.test(rule.body),
    );
    expect(declaring.length).toBeGreaterThan(0);
  });
});

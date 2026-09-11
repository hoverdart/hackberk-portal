import { z } from "zod";

/** GitHub owner and repository names: letters, digits, underscore, dot, hyphen. */
const githubPart = /^[A-Za-z0-9_.-]+$/;

/**
 * Parse and canonicalise a public GitHub repository URL.
 *
 * This is a security boundary, not a convenience. The parsed owner/repo pair is
 * interpolated into calls to the GitHub API, so an attacker who could smuggle a
 * different host, a path traversal, or a query string through here could point
 * the server at a URL of their choosing — a server-side request forgery. The
 * check is therefore an allowlist rather than a blocklist: the URL must be
 * exactly `https://github.com/<owner>/<repo>` and nothing else.
 *
 * Each rejected element matters:
 *  - non-https, or a host other than github.com — wrong destination entirely;
 *  - username or password — credentials in a URL the server would then send;
 *  - a port — redirects the request off GitHub's real endpoint;
 *  - search or hash — smuggles extra parameters into the API call;
 *  - anything but exactly two path segments — rules out traversal and deep links.
 *
 * On success it returns the canonical URL, so the same repository submitted with
 * a trailing slash or a `.git` suffix is stored one way and compared reliably.
 */
export const githubRepositoryUrlSchema = z
  .string()
  .url()
  .transform((value, context) => {
    const url = new URL(value);
    const parts = url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      parts.length !== 2 ||
      !parts.every((part) => githubPart.test(part))
    ) {
      context.addIssue({ code: "custom", message: "Use a public https://github.com/owner/repository URL." });
      return z.NEVER;
    }
    const repo = parts[1].replace(/\.git$/, "");
    return { owner: parts[0], repo, canonicalUrl: `https://github.com/${parts[0]}/${repo}` };
  });

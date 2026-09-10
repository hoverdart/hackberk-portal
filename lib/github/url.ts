import { z } from "zod";

const githubPart = /^[A-Za-z0-9_.-]+$/;

export const githubRepositoryUrlSchema = z.string().url().transform((value, context) => {
  const url = new URL(value);
  const parts = url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port || url.search || url.hash || parts.length !== 2 || !parts.every((part) => githubPart.test(part))) {
    context.addIssue({ code: "custom", message: "Use a public https://github.com/owner/repository URL." });
    return z.NEVER;
  }
  const repo = parts[1].replace(/\.git$/, "");
  return { owner: parts[0], repo, canonicalUrl: `https://github.com/${parts[0]}/${repo}` };
});

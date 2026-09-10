import "server-only";

import { createHighlighter } from "shiki";

import { fetchRepositoryFile, fetchRepositorySnapshot, type RepositorySnapshot } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

/**
 * The team's own project record, if they have one.
 *
 * A user can belong to teams across several events, so the membership list is
 * filtered down to this event in memory rather than in the query — the join
 * through `teams` makes an equivalent server-side filter considerably harder to
 * read for no measurable gain at these row counts.
 */
export async function getProjectHome(userId: string, eventId: string) {
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("team_members").select("team_id,teams(id,name,event_id)").eq("user_id", userId);
  const membership = (memberships ?? []).find((row) => (row.teams as unknown as { event_id: string })?.event_id === eventId);
  const teamId = membership?.team_id;
  const { data: project } = teamId ? await supabase.from("projects").select("*").eq("team_id", teamId).maybeSingle() : { data: null };
  return { membership, project };
}

/**
 * Project Lens: a read-only view of a team's public GitHub repository.
 *
 * The safety rule for this whole feature is that submitted code is *rendered*,
 * never executed. Shiki tokenises the source into HTML on the server, so what
 * reaches the browser is markup, not a script.
 *
 * `github_cache` is consulted first so a judging session does not hammer the
 * GitHub API once per page view; a cold cache falls through to a live fetch.
 */
export async function getProjectLens(projectId: string, path?: string) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return null;
  let snapshot = project.github_cache as unknown as RepositorySnapshot;
  if (!snapshot?.defaultBranch) snapshot = await fetchRepositorySnapshot(project.github_url);
  let source: { path: string; html: string } | null = null;
  // A file is only fetched and highlighted when one is actually being viewed.
  // Creating a highlighter is expensive, so it is built per request and disposed
  // immediately rather than held open.
  if (path) {
    const code = await fetchRepositoryFile(project.github_url, path, snapshot.defaultBranch);
    const highlighter = await createHighlighter({ themes: ["github-light"], langs: [languageForPath(path)] });
    source = { path, html: highlighter.codeToHtml(code, { lang: languageForPath(path), theme: "github-light" }) };
    highlighter.dispose();
  }
  return { project, snapshot, source };
}

/** Map a file extension to a Shiki grammar, falling back to unhighlighted text. */
function languageForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return ({ ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", py: "python", rs: "rust", go: "go", css: "css", html: "html", json: "json", md: "markdown", sql: "sql" } as Record<string, string>)[extension ?? ""] ?? "text";
}

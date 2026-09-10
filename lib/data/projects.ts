import "server-only";

import { createHighlighter } from "shiki";

import { fetchRepositoryFile, fetchRepositorySnapshot, type RepositorySnapshot } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

export async function getProjectHome(userId: string, eventId: string) {
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("team_members").select("team_id,teams(id,name,event_id)").eq("user_id", userId);
  const membership = (memberships ?? []).find((row) => (row.teams as unknown as { event_id: string })?.event_id === eventId);
  const teamId = membership?.team_id;
  const { data: project } = teamId ? await supabase.from("projects").select("*").eq("team_id", teamId).maybeSingle() : { data: null };
  return { membership, project };
}

export async function getProjectLens(projectId: string, path?: string) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return null;
  let snapshot = project.github_cache as unknown as RepositorySnapshot;
  if (!snapshot?.defaultBranch) snapshot = await fetchRepositorySnapshot(project.github_url);
  let source: { path: string; html: string } | null = null;
  if (path) {
    const code = await fetchRepositoryFile(project.github_url, path, snapshot.defaultBranch);
    const highlighter = await createHighlighter({ themes: ["github-light"], langs: [languageForPath(path)] });
    source = { path, html: highlighter.codeToHtml(code, { lang: languageForPath(path), theme: "github-light" }) };
    highlighter.dispose();
  }
  return { project, snapshot, source };
}

function languageForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return ({ ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", py: "python", rs: "rust", go: "go", css: "css", html: "html", json: "json", md: "markdown", sql: "sql" } as Record<string, string>)[extension ?? ""] ?? "text";
}

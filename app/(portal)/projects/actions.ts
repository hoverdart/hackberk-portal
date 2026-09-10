"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { fetchRepositorySnapshot } from "@/lib/github/repository";
import { githubRepositoryUrlSchema } from "@/lib/github/url";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const idSchema = z.string().uuid();
const projectSchema = z.object({ name: z.string().trim().min(2).max(120), summary: z.string().trim().min(20).max(1200), githubUrl: githubRepositoryUrlSchema, demoUrl: z.string().trim().refine((value) => !value || /^https?:\/\//.test(value), "Use a full URL.") });

export async function saveProjectAction(teamIdValue: string, eventIdValue: string, projectIdValue: string | null, formData: FormData) {
  await requireUser();
  const teamId = idSchema.parse(teamIdValue);
  const eventId = idSchema.parse(eventIdValue);
  const parsed = projectSchema.safeParse({ name: formData.get("name"), summary: formData.get("summary"), githubUrl: formData.get("githubUrl"), demoUrl: formData.get("demoUrl") });
  if (!parsed.success) redirect("/projects?error=validation");
  const supabase = await createClient();
  const payload = { event_id: eventId, team_id: teamId, name: parsed.data.name, summary: parsed.data.summary, github_url: parsed.data.githubUrl.canonicalUrl, demo_url: parsed.data.demoUrl || null };
  const result = projectIdValue ? await supabase.from("projects").update(payload).eq("id", idSchema.parse(projectIdValue)).select("id").single() : await supabase.from("projects").insert(payload).select("id").single();
  if (result.error) redirect("/projects?error=save");
  revalidatePath("/projects");
  redirect(`/projects/${result.data.id}?refresh=1`);
}

export async function refreshProjectMetadataAction(projectIdValue: string) {
  await requireUser();
  const projectId = idSchema.parse(projectIdValue);
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("github_url").eq("id", projectId).single();
  if (!project) redirect("/projects?error=missing");
  try {
    const snapshot = await fetchRepositorySnapshot(project.github_url);
    await supabase.from("projects").update({ github_cache: snapshot as unknown as Json, github_cached_at: new Date().toISOString() }).eq("id", projectId);
  } catch {
    redirect(`/projects/${projectId}?error=github`);
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function submitProjectAction(projectIdValue: string) {
  await requireUser();
  const projectId = idSchema.parse(projectIdValue);
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ submitted_at: new Date().toISOString() }).eq("id", projectId).is("submitted_at", null).select("id").maybeSingle();
  if (error || !data) redirect(`/projects/${projectId}?error=submit`);
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?success=submitted`);
}

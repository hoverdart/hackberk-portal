"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getApplicationDefinition, schemaForSection } from "@/lib/applications/definitions";
import { requireUser } from "@/lib/auth/guards";
import { applicationRoleSchema, uuidSchema, type ApplicationActionState } from "@/lib/validation/applications";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function startApplicationAction(eventId: string, roleValue: string) {
  const user = await requireUser();
  const event = uuidSchema.parse(eventId);
  const role = applicationRoleSchema.parse(roleValue);
  const supabase = await createClient();
  const { error } = await supabase.from("applications").upsert({ event_id: event, applicant_id: user.id, role, status: "draft" }, { onConflict: "event_id,applicant_id,role", ignoreDuplicates: true });
  if (error) redirect(`/applications/${role}?error=start`);
  revalidatePath("/dashboard");
  redirect(`/applications/${role}`);
}

export async function saveApplicationSectionAction(applicationIdValue: string, roleValue: string, sectionKey: string, _: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  const user = await requireUser();
  const applicationId = uuidSchema.parse(applicationIdValue);
  const role = applicationRoleSchema.parse(roleValue);
  const section = getApplicationDefinition(role).find((candidate) => candidate.key === sectionKey);
  if (!section) return { status: "error", message: "That application section no longer exists. Refresh this page." };

  const payload = Object.fromEntries(section.fields.flatMap((field) => {
    const value = field.type === "multiselect" ? formData.getAll(field.key).map(String) : formData.get(field.key);
    return value === "" || (Array.isArray(value) && value.length === 0) ? [] : [[field.key, value]];
  }));
  // Drafts intentionally accept missing required answers; final submission runs the
  // complete schema. Present values still receive URL, length, and range validation.
  const parsed = schemaForSection(section).partial().safeParse(payload);
  if (!parsed.success) {
    const errors = Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])));
    return { status: "error", message: "Some answers need attention.", errors };
  }

  const expectedVersion = Number(formData.get("answerVersion") ?? 0);
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("status,applicant_id").eq("id", applicationId).eq("applicant_id", user.id).maybeSingle();
  if (!application) return { status: "error", message: "Application not found." };
  if (application.status !== "draft") return { status: "error", message: "Submitted answers are locked. Withdraw the application before making changes." };

  if (expectedVersion > 0) {
    const { data, error } = await supabase.from("application_answers").update({ answers: parsed.data as Json, is_identity_sensitive: section.identitySensitive }).eq("application_id", applicationId).eq("section_key", sectionKey).eq("answer_version", expectedVersion).select("answer_version").maybeSingle();
    if (error) return { status: "error", message: "Draft save failed. Your answers remain on this page." };
    if (!data) return { status: "stale", message: "This draft changed elsewhere. Refresh before saving so you do not overwrite newer answers." };
    revalidatePath(`/applications/${role}`);
    return { status: "saved", message: "Draft saved", answerVersion: data.answer_version };
  }

  const { data, error } = await supabase.from("application_answers").insert({ application_id: applicationId, section_key: sectionKey, answers: parsed.data as Json, is_identity_sensitive: section.identitySensitive }).select("answer_version").single();
  if (error?.code === "23505") return { status: "stale", message: "This section was created in another tab. Refresh before saving." };
  if (error || !data) return { status: "error", message: "Draft save failed. Your answers remain on this page." };
  revalidatePath(`/applications/${role}`);
  return { status: "saved", message: "Draft saved", answerVersion: data.answer_version };
}

export async function submitApplicationAction(applicationIdValue: string, roleValue: string) {
  const user = await requireUser();
  const applicationId = uuidSchema.parse(applicationIdValue);
  const role = applicationRoleSchema.parse(roleValue);
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("status,event_id").eq("id", applicationId).eq("applicant_id", user.id).maybeSingle();
  if (!application || application.status !== "draft") redirect(`/applications/${role}?error=not-draft`);
  const { data: answerRows } = await supabase.from("application_answers").select("section_key,answers").eq("application_id", applicationId);
  const answers = Object.fromEntries((answerRows ?? []).map((row) => [row.section_key, row.answers]));
  const invalidSection = getApplicationDefinition(role).find((section) => !schemaForSection(section).safeParse(answers[section.key] ?? {}).success);
  if (invalidSection) redirect(`/applications/${role}?error=incomplete&section=${invalidSection.key}`);
  const { error } = await supabase.from("applications").update({ status: "submitted" }).eq("id", applicationId).eq("applicant_id", user.id);
  if (error) redirect(`/applications/${role}?error=submit`);
  revalidatePath("/dashboard");
  revalidatePath(`/applications/${role}`);
  redirect(`/applications/${role}?success=submitted`);
}

export async function withdrawApplicationAction(applicationIdValue: string, roleValue: string) {
  const user = await requireUser();
  const applicationId = uuidSchema.parse(applicationIdValue);
  const role = applicationRoleSchema.parse(roleValue);
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ status: "withdrawn" }).eq("id", applicationId).eq("applicant_id", user.id);
  if (error) redirect(`/applications/${role}?error=withdraw`);
  revalidatePath("/dashboard");
  revalidatePath(`/applications/${role}`);
  redirect(`/applications/${role}?success=withdrawn`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getApplicationDefinition, schemaForSection } from "@/lib/applications/definitions";
import { requireUser } from "@/lib/auth/guards";
import { applicationRoleSchema, uuidSchema, type ApplicationActionState } from "@/lib/validation/applications";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Server Actions for the application wizard.
 *
 * Every action re-derives the user from the session with `requireUser` and scopes
 * its writes with `.eq("applicant_id", user.id)`. The id is never accepted as a
 * parameter, so one applicant cannot address another's row. RLS enforces the same
 * rule in Postgres; the filters here make the intent legible and give a clean
 * error instead of a silent zero-row update.
 */

/**
 * Create the draft row for a role, then open the wizard.
 *
 * `ignoreDuplicates` makes this idempotent: a double click, or returning to the
 * dashboard and pressing Start again, reopens the existing draft rather than
 * failing on the unique constraint.
 */
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

/**
 * Save one wizard section as a draft.
 *
 * Two rules shape this function:
 *
 *  1. Drafts accept incomplete answers. A `.partial()` schema means an applicant
 *     can save half a section and come back, while anything they *did* fill in is
 *     still validated for shape, length and range. The complete schema runs at
 *     submission instead.
 *  2. Saves are version-checked. The form posts the `answerVersion` it rendered
 *     from, and the update only matches a row still at that version. A second tab
 *     therefore gets a "stale" result instead of silently overwriting newer work.
 */
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
  // Once submitted, answers freeze. Reviewers must be reading the same text the
  // applicant committed to, so editing requires withdrawing first.
  if (application.status !== "draft") return { status: "error", message: "Submitted answers are locked. Withdraw the application before making changes." };

  // A version of 0 means the section has never been saved, so this is an insert;
  // anything higher is an update that must match the version it came from.
  if (expectedVersion > 0) {
    const { data, error } = await supabase.from("application_answers").update({ answers: parsed.data as Json, is_identity_sensitive: section.identitySensitive }).eq("application_id", applicationId).eq("section_key", sectionKey).eq("answer_version", expectedVersion).select("answer_version").maybeSingle();
    if (error) return { status: "error", message: "Draft save failed. Your answers remain on this page." };
    if (!data) return { status: "stale", message: "This draft changed elsewhere. Refresh before saving so you do not overwrite newer answers." };
    revalidatePath(`/applications/${role}`);
    return { status: "saved", message: "Draft saved", answerVersion: data.answer_version };
  }

  const { data, error } = await supabase.from("application_answers").insert({ application_id: applicationId, section_key: sectionKey, answers: parsed.data as Json, is_identity_sensitive: section.identitySensitive }).select("answer_version").single();
  // 23505 is Postgres' unique-violation code: another tab inserted this section
  // first, so this is a stale write rather than a real failure.
  if (error?.code === "23505") return { status: "stale", message: "This section was created in another tab. Refresh before saving." };
  if (error || !data) return { status: "error", message: "Draft save failed. Your answers remain on this page." };
  revalidatePath(`/applications/${role}`);
  return { status: "saved", message: "Draft saved", answerVersion: data.answer_version };
}

/**
 * Submit a completed application.
 *
 * This is where the full schema runs. Every section is re-validated server-side
 * against the same definitions the wizard rendered from, so an application cannot
 * be submitted incomplete by posting directly to this action. On failure the
 * applicant is sent back to the exact section that failed rather than to a
 * generic error.
 */
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

/**
 * Withdraw an application, returning it to an editable state.
 *
 * The legal status transitions are enforced by a database trigger, so an attempt
 * to withdraw something that cannot be withdrawn fails in Postgres rather than
 * relying on this action to have checked.
 */
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

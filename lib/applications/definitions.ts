import { z } from "zod";

import type { ApplicationRole } from "@/lib/domain/applications";

export type FieldDefinition = {
  key: string;
  label: string;
  description?: string;
  type: "text" | "textarea" | "select" | "multiselect" | "url" | "number";
  required: boolean;
  options?: string[];
  maxLength?: number;
};

export type SectionDefinition = {
  key: string;
  title: string;
  summary: string;
  identitySensitive: boolean;
  fields: FieldDefinition[];
};

const commonProfile: SectionDefinition = {
  key: "profile",
  title: "Profile",
  summary: "Identity and eligibility details. Hidden from blind reviewers.",
  identitySensitive: true,
  fields: [
    { key: "school", label: "School or organization", type: "text", required: true, maxLength: 160 },
    { key: "graduationYear", label: "Graduation year", type: "number", required: true },
    { key: "portfolioUrl", label: "Portfolio or LinkedIn", type: "url", required: false },
  ],
};

const logistics: SectionDefinition = {
  key: "logistics",
  title: "Logistics",
  summary: "Availability and accommodations. Shared only with authorized operations staff.",
  identitySensitive: true,
  fields: [
    { key: "availability", label: "Which event days can you attend?", type: "multiselect", required: true, options: ["Friday", "Saturday", "Sunday"] },
    { key: "dietaryNeeds", label: "Dietary needs", type: "text", required: false, maxLength: 240 },
    { key: "accommodations", label: "Accessibility or accommodation requests", description: "Tell us what would help you participate fully.", type: "textarea", required: false, maxLength: 800 },
  ],
};

const roleSections: Record<ApplicationRole, SectionDefinition> = {
  hacker: {
    key: "experience", title: "Builder story", summary: "What you want to learn and make.", identitySensitive: false,
    fields: [
      { key: "motivation", label: "Why do you want to join this hackathon?", type: "textarea", required: true, maxLength: 1200 },
      { key: "skills", label: "Skills you would bring", type: "multiselect", required: true, options: ["Frontend", "Backend", "AI / ML", "Design", "Hardware", "Product", "Beginner energy"] },
      { key: "projectInterest", label: "What might you explore?", type: "textarea", required: true, maxLength: 800 },
    ],
  },
  judge: {
    key: "experience", title: "Judging practice", summary: "How you evaluate projects and support builders.", identitySensitive: false,
    fields: [
      { key: "expertise", label: "Areas of expertise", type: "multiselect", required: true, options: ["AI / ML", "Web", "Mobile", "Hardware", "Social impact", "Design", "Entrepreneurship"] },
      { key: "judgingExperience", label: "Tell us about your judging or evaluation experience", type: "textarea", required: true, maxLength: 1000 },
      { key: "fairness", label: "How do you keep scoring fair and useful?", type: "textarea", required: true, maxLength: 800 },
    ],
  },
  mentor: {
    key: "experience", title: "Mentor toolkit", summary: "The guidance you can offer under event pressure.", identitySensitive: false,
    fields: [
      { key: "expertise", label: "Mentoring expertise", type: "multiselect", required: true, options: ["AI / ML", "Web", "Mobile", "Hardware", "Product", "Pitching", "Design"] },
      { key: "mentorshipStyle", label: "How do you unblock a team without taking over?", type: "textarea", required: true, maxLength: 1000 },
      { key: "experience", label: "Relevant technical or community experience", type: "textarea", required: true, maxLength: 1000 },
    ],
  },
  volunteer: {
    key: "experience", title: "Operations story", summary: "How you help a busy room feel cared for.", identitySensitive: false,
    fields: [
      { key: "motivation", label: "Why do you want to volunteer?", type: "textarea", required: true, maxLength: 900 },
      { key: "strengths", label: "Operations strengths", type: "multiselect", required: true, options: ["Check-in", "Hospitality", "Accessibility", "Logistics", "Photography", "Stage support", "Technical support"] },
      { key: "pressure", label: "Tell us how you handle a fast-changing situation", type: "textarea", required: true, maxLength: 900 },
    ],
  },
};

export function getApplicationDefinition(role: ApplicationRole): SectionDefinition[] {
  return [commonProfile, roleSections[role], logistics];
}

export function schemaForSection(section: SectionDefinition) {
  return z.object(Object.fromEntries(section.fields.map((field) => {
    let schema: z.ZodType;
    if (field.type === "multiselect") schema = z.array(z.string()).min(field.required ? 1 : 0, "Select at least one option.");
    else if (field.type === "number") schema = z.coerce.number().int().min(2020).max(2040);
    else {
      let stringSchema = z.string().trim();
      if (field.required) stringSchema = stringSchema.min(1, "This answer is required.");
      if (field.maxLength) stringSchema = stringSchema.max(field.maxLength, `Keep this under ${field.maxLength} characters.`);
      schema = field.type === "url" ? stringSchema.refine((value) => !value || /^https?:\/\//.test(value), "Use a full http:// or https:// URL.") : stringSchema;
    }
    return [field.key, schema];
  })));
}

export function completionForAnswers(role: ApplicationRole, answers: Record<string, Record<string, unknown>>) {
  const sections = getApplicationDefinition(role);
  const complete = sections.filter((section) => schemaForSection(section).safeParse(answers[section.key] ?? {}).success).length;
  return Math.round((complete / sections.length) * 100);
}

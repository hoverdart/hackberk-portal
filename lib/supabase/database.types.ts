/* eslint-disable @typescript-eslint/no-explicit-any */
// Migration-derived development snapshot. Regenerate from the linked project with
// `npm run db:types` after applying migrations; CI checks that this file still compiles.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type ApplicationRole = "hacker" | "judge" | "mentor" | "volunteer";
export type ApplicationStatus =
  "draft" | "submitted" | "under_review" | "accepted" | "waitlisted" | "rejected" | "withdrawn";

type Table<Row extends Record<string, any>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type EventRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  venue: string;
  timezone: string;
  starts_at: string;
  ends_at: string;
  applications_open_at: string;
  applications_close_at: string;
  application_forms: Json;
  application_rubric: Json;
  project_rubric: Json;
  is_active: boolean;
  is_synthetic: boolean;
  created_at: string;
  updated_at: string;
};
type ProfileRow = {
  id: string;
  full_name: string;
  preferred_name: string | null;
  school: string | null;
  graduation_year: number | null;
  pronouns: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};
type ApplicationRow = {
  id: string;
  event_id: string;
  applicant_id: string;
  role: ApplicationRole;
  status: ApplicationStatus;
  form_version: number;
  lock_version: number;
  submitted_at: string | null;
  withdrawn_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};
type AnswerRow = {
  id: string;
  application_id: string;
  section_key: string;
  answers: Json;
  is_identity_sensitive: boolean;
  answer_version: number;
  updated_at: string;
};
type GenericRow = Record<string, any>;

export type Database = {
  public: {
    Tables: {
      events: Table<EventRow>;
      profiles: Table<ProfileRow>;
      staff_members: Table<GenericRow>;
      applications: Table<ApplicationRow>;
      application_answers: Table<AnswerRow>;
      review_assignments: Table<GenericRow>;
      application_reviews: Table<GenericRow>;
      audit_log: Table<GenericRow>;
      matching_profiles: Table<GenericRow>;
      teams: Table<GenericRow>;
      team_members: Table<GenericRow>;
      team_invitations: Table<GenericRow>;
      projects: Table<GenericRow>;
      project_review_assignments: Table<GenericRow>;
      project_reviews: Table<GenericRow>;
      event_milestones: Table<GenericRow>;
      mentor_requests: Table<GenericRow>;
      volunteer_shifts: Table<GenericRow>;
      volunteer_shift_assignments: Table<GenericRow>;
    };
    Views: {
      organizer_application_queue: {
        Row: {
          application_id: string;
          event_id: string;
          applicant_id: string;
          applicant_name: string;
          role: ApplicationRole;
          status: ApplicationStatus;
          created_at: string;
          submitted_at: string | null;
          assigned_reviewers: number;
          submitted_reviews: number;
          aggregate_score: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_application_review: { Args: { target_application: string }; Returns: string };
      decide_application: {
        Args: { target_application: string; target_decision: ApplicationStatus };
        Returns: undefined;
      };
      team_match_candidates: {
        Args: { target_event: string };
        Returns: Array<{ user_id: string; score: number; reasons: Json }>;
      };
      create_hacker_team: { Args: { target_event: string; team_name: string }; Returns: string };
      respond_team_invitation: { Args: { target_invitation: string; accept_invitation: boolean }; Returns: undefined };
      claim_mentor_request: { Args: { target_request: string }; Returns: undefined };
      join_volunteer_shift: { Args: { target_shift: string }; Returns: undefined };
      claim_test_organizer_membership: { Args: Record<PropertyKey, never>; Returns: undefined };
    };
    Enums: {
      application_role: ApplicationRole;
      application_status: ApplicationStatus;
      staff_role: "organizer" | "reviewer";
      review_status: "draft" | "submitted" | "conflict";
      invitation_status: "pending" | "accepted" | "declined" | "cancelled";
      request_status: "open" | "claimed" | "resolved" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};

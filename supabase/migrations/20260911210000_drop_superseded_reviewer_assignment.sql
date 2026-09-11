-- `assign_application_reviewer` was superseded by `claim_application_review`
-- when grading moved to one accountable organizer per application, and
-- 20260911061357 revoked execute from every role. Revoked is not the same as
-- gone: the function body, and the assumptions it encodes about a reviewer
-- being assignable by someone else, were still installed. Drop it.
drop function if exists public.assign_application_reviewer(uuid, uuid);


-- Ensure required uniqueness for participant-auth upsert workflow and data integrity

-- 1) Unique per participant (needed for ON CONFLICT (participant_id) in edge function)
CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_sessions_participant_id
  ON public.participant_sessions (participant_id);

-- 2) Ensure each session token is unique
CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_sessions_session_token
  ON public.participant_sessions (session_token);

-- 3) Ensure each ticket code is unique at the session level (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_sessions_ticket_code
  ON public.participant_sessions (ticket_code);

-- 4) Prevent duplicate participants for the same QR/ticket code
CREATE UNIQUE INDEX IF NOT EXISTS ux_participants_qr_code
  ON public.participants (qr_code);

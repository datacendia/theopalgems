-- Add survey_scheduled_at column to subscribers table
-- Used to schedule automatic survey emails 24h after confirmation

ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS survey_scheduled_at timestamptz;

-- Add index for efficient querying of pending survey sends
CREATE INDEX IF NOT EXISTS idx_subscribers_survey_scheduled
ON public.subscribers (survey_scheduled_at)
WHERE survey_scheduled_at IS NOT NULL AND survey_completed_at IS NULL;

-- Comment
COMMENT ON COLUMN public.subscribers.survey_scheduled_at IS 'Timestamp when the survey email should be sent (24h after confirmation). Set by /api/confirm, consumed by scheduled job.';

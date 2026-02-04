-- Migration: Make response_id and fragebogen_id nullable in fb_zeiterfassung_submissions
-- This allows zeiterfassung to work independently of fragebogen responses

-- Drop the existing unique constraint
ALTER TABLE fb_zeiterfassung_submissions 
DROP CONSTRAINT IF EXISTS unique_zeiterfassung_per_response;

-- Make response_id nullable
ALTER TABLE fb_zeiterfassung_submissions 
ALTER COLUMN response_id DROP NOT NULL;

-- Make fragebogen_id nullable
ALTER TABLE fb_zeiterfassung_submissions 
ALTER COLUMN fragebogen_id DROP NOT NULL;

-- Recreate the unique constraint (NULL values are not considered equal in UNIQUE constraints)
ALTER TABLE fb_zeiterfassung_submissions 
ADD CONSTRAINT unique_zeiterfassung_per_response UNIQUE (response_id);

-- Verify the changes
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'fb_zeiterfassung_submissions' 
    AND column_name IN ('response_id', 'fragebogen_id')
ORDER BY column_name;

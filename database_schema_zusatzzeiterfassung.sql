-- ============================================================================
-- ZUSATZ ZEITERFASSUNG (Additional Time Entries)
-- ============================================================================
-- Additional time entries for non-market activities (doctor, training, etc.)
-- Used by GLs to track time spent on activities outside of regular market visits
-- ============================================================================

CREATE TABLE IF NOT EXISTS fb_zusatz_zeiterfassung (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Required: which GL this entry belongs to
    gebietsleiter_id UUID NOT NULL,
    
    -- Date of the entry
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Reason for the time entry
    -- Values: 'marktbesuch', 'arztbesuch', 'werkstatt', 'homeoffice', 'schulung', 'lager', 'heimfahrt', 'hotel'
    reason VARCHAR(50) NOT NULL,
    reason_label VARCHAR(100) NOT NULL,
    
    -- Time range
    zeit_von TIME NOT NULL,
    zeit_bis TIME NOT NULL,
    zeit_diff INTERVAL, -- Calculated duration, stored as interval
    
    -- Optional comment
    kommentar TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint (run after users table exists)
-- ALTER TABLE fb_zusatz_zeiterfassung 
--     ADD CONSTRAINT fk_zusatz_zeit_gl 
--     FOREIGN KEY (gebietsleiter_id) REFERENCES users(id) ON DELETE CASCADE;

-- Indexes for fb_zusatz_zeiterfassung
CREATE INDEX IF NOT EXISTS idx_fb_zusatz_zeit_gl ON fb_zusatz_zeiterfassung(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_fb_zusatz_zeit_date ON fb_zusatz_zeiterfassung(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_fb_zusatz_zeit_reason ON fb_zusatz_zeiterfassung(reason);
CREATE INDEX IF NOT EXISTS idx_fb_zusatz_zeit_created ON fb_zusatz_zeiterfassung(created_at DESC);

-- Trigger for updated_at
-- Note: Requires the update_fb_updated_at_column() function from database_schema_fragebogen.sql
-- If function doesn't exist, create it first or use this inline version:
CREATE OR REPLACE FUNCTION update_zusatz_zeit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fb_zusatz_zeiterfassung_updated_at
    BEFORE UPDATE ON fb_zusatz_zeiterfassung
    FOR EACH ROW
    EXECUTE FUNCTION update_zusatz_zeit_updated_at();

-- ============================================================================
-- REASON VALUES REFERENCE (zusatzzeiterfassung)
-- ============================================================================
-- reason: 'marktbesuch'    | reason_label: 'Marktbesuch'
-- reason: 'arztbesuch'     | reason_label: 'Arztbesuch'
-- reason: 'werkstatt'      | reason_label: 'Werkstatt/Autoreinigung'
-- reason: 'homeoffice'     | reason_label: 'Homeoffice'
-- reason: 'schulung'       | reason_label: 'Schulung'
-- reason: 'lager'          | reason_label: 'Lager'
-- reason: 'heimfahrt'      | reason_label: 'Heimfahrt'
-- reason: 'hotel'          | reason_label: 'Hotelübernachtung'
-- ============================================================================

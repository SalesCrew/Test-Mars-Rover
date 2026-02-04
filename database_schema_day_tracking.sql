-- Day Tracking Database Schema
-- Tracks GL daily time tracking with automatic Fahrzeit calculation

-- ============================================================================
-- MAIN DAY TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_day_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gebietsleiter_id UUID NOT NULL,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Day boundaries
    day_start_time TIME,                    -- When GL pressed "Start Day"
    day_end_time TIME,                      -- When GL pressed "End Day"
    skipped_first_fahrzeit BOOLEAN DEFAULT FALSE,  -- If GL was already at market
    
    -- Calculated totals (updated on day end)
    total_fahrzeit INTERVAL,                -- Sum of all Fahrzeiten
    total_besuchszeit INTERVAL,             -- Sum of all market visit times
    total_unterbrechung INTERVAL,           -- Sum of interruption times
    total_arbeitszeit INTERVAL,             -- day_end - day_start - unterbrechung
    markets_visited INTEGER DEFAULT 0,       -- Number of markets visited
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'force_closed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one record per GL per day
    UNIQUE(gebietsleiter_id, tracking_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fb_day_tracking_gl ON fb_day_tracking(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_fb_day_tracking_date ON fb_day_tracking(tracking_date DESC);
CREATE INDEX IF NOT EXISTS idx_fb_day_tracking_status ON fb_day_tracking(status);
CREATE INDEX IF NOT EXISTS idx_fb_day_tracking_gl_date ON fb_day_tracking(gebietsleiter_id, tracking_date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_fb_day_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fb_day_tracking_updated_at
    BEFORE UPDATE ON fb_day_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_fb_day_tracking_updated_at();

-- ============================================================================
-- MODIFY fb_zeiterfassung_submissions TABLE
-- Add new columns for automatic Fahrzeit calculation
-- ============================================================================

-- Add market_start_time column (when the market visit started)
ALTER TABLE fb_zeiterfassung_submissions 
ADD COLUMN IF NOT EXISTS market_start_time TIME;

-- Add market_end_time column (when the market visit ended)
ALTER TABLE fb_zeiterfassung_submissions 
ADD COLUMN IF NOT EXISTS market_end_time TIME;

-- Add calculated_fahrzeit column (auto-calculated from previous market end or day start)
ALTER TABLE fb_zeiterfassung_submissions 
ADD COLUMN IF NOT EXISTS calculated_fahrzeit INTERVAL;

-- Add day_tracking_id to link to the day tracking record
ALTER TABLE fb_zeiterfassung_submissions 
ADD COLUMN IF NOT EXISTS day_tracking_id UUID REFERENCES fb_day_tracking(id) ON DELETE SET NULL;

-- Add visit_order column to track the order of visits within a day
ALTER TABLE fb_zeiterfassung_submissions 
ADD COLUMN IF NOT EXISTS visit_order INTEGER DEFAULT 1;

-- Index for day_tracking_id
CREATE INDEX IF NOT EXISTS idx_fb_zeiterfassung_day_tracking 
ON fb_zeiterfassung_submissions(day_tracking_id);

-- Index for visit ordering within a day
CREATE INDEX IF NOT EXISTS idx_fb_zeiterfassung_visit_order 
ON fb_zeiterfassung_submissions(gebietsleiter_id, created_at, visit_order);

-- ============================================================================
-- MODIFY fb_zusatz_zeiterfassung TABLE
-- Add support for Unterbrechung entries
-- ============================================================================

-- Add column to mark if entry deducts from work time
ALTER TABLE fb_zusatz_zeiterfassung 
ADD COLUMN IF NOT EXISTS is_work_time_deduction BOOLEAN DEFAULT FALSE;

-- Add day_tracking_id to link to the day tracking record
ALTER TABLE fb_zusatz_zeiterfassung 
ADD COLUMN IF NOT EXISTS day_tracking_id UUID REFERENCES fb_day_tracking(id) ON DELETE SET NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE fb_day_tracking ENABLE ROW LEVEL SECURITY;

-- GLs can manage their own day tracking records
CREATE POLICY "GLs can manage their own day tracking" ON fb_day_tracking
    FOR ALL USING (gebietsleiter_id = auth.uid());

-- Admins can view all day tracking records
CREATE POLICY "Admins can view all day tracking" ON fb_day_tracking
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- ============================================================================
-- SAMPLE REASON VALUES FOR fb_zusatz_zeiterfassung
-- ============================================================================
-- Updated reason types:
-- 'unterbrechung' → 'Unterbrechung' (is_work_time_deduction = true)
-- 'marktbesuch'   → 'Marktbesuch'
-- 'arztbesuch'    → 'Arztbesuch'
-- 'werkstatt'     → 'Werkstatt/Autoreinigung'
-- 'homeoffice'    → 'Homeoffice'
-- 'schulung'      → 'Schulung'
-- 'lager'         → 'Lager'
-- 'heimfahrt'     → 'Heimfahrt'
-- 'hotel'         → 'Hotelübernachtung'

-- ============================================================================
-- HELPER FUNCTION: Calculate time difference
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_time_diff(start_time TIME, end_time TIME)
RETURNS INTERVAL AS $$
DECLARE
    diff_minutes INTEGER;
BEGIN
    IF start_time IS NULL OR end_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    diff_minutes := EXTRACT(EPOCH FROM (end_time - start_time)) / 60;
    
    -- Handle overnight (add 24 hours if negative)
    IF diff_minutes < 0 THEN
        diff_minutes := diff_minutes + (24 * 60);
    END IF;
    
    RETURN make_interval(mins => diff_minutes);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get last market visit for a GL on a date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_last_market_visit(gl_id UUID, visit_date DATE)
RETURNS TABLE(
    id UUID,
    market_end_time TIME,
    visit_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.market_end_time,
        z.visit_order
    FROM fb_zeiterfassung_submissions z
    WHERE z.gebietsleiter_id = gl_id
      AND DATE(z.created_at) = visit_date
      AND z.market_end_time IS NOT NULL
    ORDER BY z.visit_order DESC, z.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VORVERKAUF WELLEN (Campaigns) Database Schema
-- This is SEPARATE from the existing:
--   - wellen/wellen_* tables (for Vorbesteller)
--   - vorverkauf_entries/items (for Produktersatz)
-- ============================================================================

-- ============================================================================
-- MAIN VORVERKAUF WELLEN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vorverkauf_wellen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('upcoming', 'active', 'past')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vorverkauf_wellen_status ON vorverkauf_wellen(status);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_wellen_dates ON vorverkauf_wellen(start_date, end_date);

-- ============================================================================
-- VORVERKAUF WELLEN MARKETS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vorverkauf_wellen_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES vorverkauf_wellen(id) ON DELETE CASCADE,
    market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    CONSTRAINT unique_vorverkauf_welle_market UNIQUE (welle_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_vorverkauf_wellen_markets_welle ON vorverkauf_wellen_markets(welle_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_wellen_markets_market ON vorverkauf_wellen_markets(market_id);

-- ============================================================================
-- VORVERKAUF SUBMISSIONS TABLE
-- Tracks each Vorverkauf submission by a GL for a specific wave and market
-- ============================================================================
CREATE TABLE IF NOT EXISTS vorverkauf_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vorverkauf_welle_id UUID NOT NULL REFERENCES vorverkauf_wellen(id) ON DELETE CASCADE,
    gebietsleiter_id UUID NOT NULL REFERENCES gebietsleiter(id) ON DELETE CASCADE,
    market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vorverkauf_submissions_welle ON vorverkauf_submissions(vorverkauf_welle_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_submissions_gl ON vorverkauf_submissions(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_submissions_market ON vorverkauf_submissions(market_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_submissions_created ON vorverkauf_submissions(created_at DESC);

-- ============================================================================
-- VORVERKAUF SUBMISSION PRODUCTS TABLE
-- Products included in each submission with quantity and reason
-- ============================================================================
CREATE TABLE IF NOT EXISTS vorverkauf_submission_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES vorverkauf_submissions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('OOS', 'Listungslücke', 'Platzierung')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vorverkauf_submission_products_submission ON vorverkauf_submission_products(submission_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_submission_products_product ON vorverkauf_submission_products(product_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vorverkauf_wellen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_vorverkauf_wellen_updated_at ON vorverkauf_wellen;
CREATE TRIGGER update_vorverkauf_wellen_updated_at 
    BEFORE UPDATE ON vorverkauf_wellen
    FOR EACH ROW EXECUTE FUNCTION update_vorverkauf_wellen_updated_at();

-- Function to auto-update vorverkauf welle status based on dates
CREATE OR REPLACE FUNCTION update_vorverkauf_welle_status()
RETURNS void AS $$
BEGIN
    -- Update to 'past' if end_date has passed
    UPDATE vorverkauf_wellen
    SET status = 'past'
    WHERE status != 'past' 
    AND end_date < CURRENT_DATE;
    
    -- Update to 'active' if start_date has arrived and end_date hasn't passed
    UPDATE vorverkauf_wellen
    SET status = 'active'
    WHERE status = 'upcoming'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE;
    
    -- Update to 'upcoming' if start_date is in the future
    UPDATE vorverkauf_wellen
    SET status = 'upcoming'
    WHERE status = 'active'
    AND start_date > CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE vorverkauf_wellen ENABLE ROW LEVEL SECURITY;
ALTER TABLE vorverkauf_wellen_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vorverkauf_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vorverkauf_submission_products ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
DROP POLICY IF EXISTS "Service role has full access to vorverkauf_wellen" ON vorverkauf_wellen;
CREATE POLICY "Service role has full access to vorverkauf_wellen" ON vorverkauf_wellen
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role has full access to vorverkauf_wellen_markets" ON vorverkauf_wellen_markets;
CREATE POLICY "Service role has full access to vorverkauf_wellen_markets" ON vorverkauf_wellen_markets
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role has full access to vorverkauf_submissions" ON vorverkauf_submissions;
CREATE POLICY "Service role has full access to vorverkauf_submissions" ON vorverkauf_submissions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role has full access to vorverkauf_submission_products" ON vorverkauf_submission_products;
CREATE POLICY "Service role has full access to vorverkauf_submission_products" ON vorverkauf_submission_products
    FOR ALL USING (true);

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View: Vorverkauf wellen with aggregated counts
CREATE OR REPLACE VIEW vorverkauf_wellen_overview AS
SELECT 
    vw.id,
    vw.name,
    vw.image_url,
    vw.start_date,
    vw.end_date,
    vw.status,
    vw.created_at,
    vw.updated_at,
    COUNT(DISTINCT vwm.market_id) as assigned_markets_count,
    COUNT(DISTINCT vs.id) as total_submissions,
    COUNT(DISTINCT vs.gebietsleiter_id) as participating_gls_count
FROM vorverkauf_wellen vw
LEFT JOIN vorverkauf_wellen_markets vwm ON vw.id = vwm.welle_id
LEFT JOIN vorverkauf_submissions vs ON vw.id = vs.vorverkauf_welle_id
GROUP BY vw.id;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This schema is SEPARATE from:
--   1. wellen, wellen_displays, wellen_kartonware, etc. (Vorbesteller system)
--   2. vorverkauf_entries, vorverkauf_items (Produktersatz system)
--
-- Table naming convention:
--   - vorverkauf_wellen = Vorverkauf campaigns/waves
--   - vorverkauf_wellen_markets = Markets assigned to a Vorverkauf wave
--   - vorverkauf_submissions = GL submissions for Vorverkauf
--   - vorverkauf_submission_products = Products in each submission
--
-- ============================================================================

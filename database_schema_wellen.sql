-- Wellen (Waves) System Database Schema
-- This schema manages pre-order waves with displays, kartonware, markets, and GL progress tracking

-- ============================================================================
-- MAIN WELLEN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('upcoming', 'active', 'past')),
    
    -- Types enabled for this wave (display, kartonware, palette, schuette, einzelprodukt)
    types TEXT[] DEFAULT '{}',
    
    -- Goal configuration (wave-level)
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('percentage', 'value')),
    goal_percentage DECIMAL(5,2), -- For percentage goals (e.g., 80.00)
    goal_value DECIMAL(12,2), -- For value goals (e.g., 25000.00)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT goal_percentage_check CHECK (
        (goal_type = 'percentage' AND goal_percentage IS NOT NULL AND goal_percentage >= 0 AND goal_percentage <= 100)
        OR (goal_type = 'value' AND goal_value IS NOT NULL AND goal_value >= 0)
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wellen_status ON wellen(status);
CREATE INDEX IF NOT EXISTS idx_wellen_dates ON wellen(start_date, end_date);

-- ============================================================================
-- WELLEN DISPLAYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_displays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_number INTEGER NOT NULL CHECK (target_number > 0),
    item_value DECIMAL(10,2), -- Only used when welle.goal_type = 'value'
    picture_url TEXT,
    display_order INTEGER DEFAULT 0, -- For maintaining order
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_welle_displays FOREIGN KEY (welle_id) REFERENCES wellen(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellen_displays_welle ON wellen_displays(welle_id);

-- ============================================================================
-- WELLEN KARTONWARE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_kartonware (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_number INTEGER NOT NULL CHECK (target_number > 0),
    item_value DECIMAL(10,2), -- Only used when welle.goal_type = 'value'
    picture_url TEXT,
    kartonware_order INTEGER DEFAULT 0, -- For maintaining order
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_welle_kartonware FOREIGN KEY (welle_id) REFERENCES wellen(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellen_kartonware_welle ON wellen_kartonware(welle_id);

-- ============================================================================
-- WELLEN EINZELPRODUKTE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_einzelprodukte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_number INTEGER NOT NULL CHECK (target_number > 0),
    item_value DECIMAL(10,2), -- Only used when welle.goal_type = 'value'
    picture_url TEXT,
    einzelprodukt_order INTEGER DEFAULT 0, -- For maintaining order
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_welle_einzelprodukte FOREIGN KEY (welle_id) REFERENCES wellen(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellen_einzelprodukte_welle ON wellen_einzelprodukte(welle_id);

-- ============================================================================
-- WELLEN CALENDAR WEEK DAYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_kw_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    kw VARCHAR(10) NOT NULL, -- e.g., 'KW50'
    days TEXT[] NOT NULL, -- Array of days: ['MO', 'MI', 'FR']
    kw_order INTEGER DEFAULT 0, -- For maintaining order
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_welle_kw_days FOREIGN KEY (welle_id) REFERENCES wellen(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellen_kw_days_welle ON wellen_kw_days(welle_id);

-- ============================================================================
-- WELLEN MARKETS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    market_id VARCHAR(50) NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    CONSTRAINT unique_welle_market UNIQUE (welle_id, market_id),
    CONSTRAINT fk_welle_markets_welle FOREIGN KEY (welle_id) REFERENCES wellen(id) ON DELETE CASCADE,
    CONSTRAINT fk_welle_markets_market FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellen_markets_welle ON wellen_markets(welle_id);
CREATE INDEX IF NOT EXISTS idx_wellen_markets_market ON wellen_markets(market_id);

-- ============================================================================
-- WELLEN GL PROGRESS TABLE
-- Tracks each Gebietsleiter's progress on displays and kartonware
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_gl_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    gebietsleiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Item reference (display, kartonware, palette, schuette, or einzelprodukt)
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('display', 'kartonware', 'palette', 'schuette', 'einzelprodukt')),
    item_id UUID NOT NULL, -- References wellen_displays.id or wellen_kartonware.id
    
    -- Progress tracking
    current_number INTEGER DEFAULT 0 CHECK (current_number >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate progress entries
    CONSTRAINT unique_gl_item_progress UNIQUE (welle_id, gebietsleiter_id, item_type, item_id),
    CONSTRAINT fk_welle_gl_progress_welle FOREIGN KEY (welle_id) REFERENCES wellen(id) ON DELETE CASCADE,
    CONSTRAINT fk_welle_gl_progress_gl FOREIGN KEY (gebietsleiter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellen_gl_progress_welle ON wellen_gl_progress(welle_id);
CREATE INDEX IF NOT EXISTS idx_wellen_gl_progress_gl ON wellen_gl_progress(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_wellen_gl_progress_item ON wellen_gl_progress(item_type, item_id);

-- Performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_wellen_gl_progress_composite 
  ON wellen_gl_progress(welle_id, item_type, item_id);

-- Index for chain filtering on markets table
-- CREATE INDEX IF NOT EXISTS idx_markets_chain ON markets(chain);
-- Note: Uncomment above line if the markets table doesn't already have this index

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_wellen_updated_at BEFORE UPDATE ON wellen
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellen_gl_progress_updated_at BEFORE UPDATE ON wellen_gl_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update welle status based on dates
CREATE OR REPLACE FUNCTION update_welle_status()
RETURNS void AS $$
BEGIN
    -- Update to 'past' if end_date has passed
    UPDATE wellen
    SET status = 'past'
    WHERE status != 'past' 
    AND end_date < CURRENT_DATE;
    
    -- Update to 'active' if start_date has arrived and end_date hasn't passed
    UPDATE wellen
    SET status = 'active'
    WHERE status = 'upcoming'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE;
    
    -- Update to 'upcoming' if start_date is in the future
    UPDATE wellen
    SET status = 'upcoming'
    WHERE status = 'active'
    AND start_date > CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View: Complete welle data with aggregated counts
CREATE OR REPLACE VIEW wellen_overview AS
SELECT 
    w.id,
    w.name,
    w.image_url,
    w.start_date,
    w.end_date,
    w.status,
    w.goal_type,
    w.goal_percentage,
    w.goal_value,
    w.created_at,
    w.updated_at,
    
    -- Counts
    COUNT(DISTINCT wd.id) as display_count,
    COUNT(DISTINCT wk.id) as kartonware_count,
    COUNT(DISTINCT wm.market_id) as assigned_markets_count,
    COUNT(DISTINCT wgp.gebietsleiter_id) as participating_gls_count,
    
    -- Aggregated data
    COALESCE(SUM(CASE WHEN wgp.item_type = 'display' THEN wgp.current_number ELSE 0 END), 0) as total_displays_current,
    COALESCE(SUM(CASE WHEN wgp.item_type = 'display' THEN wd.target_number ELSE 0 END), 0) as total_displays_target,
    COALESCE(SUM(CASE WHEN wgp.item_type = 'kartonware' THEN wgp.current_number ELSE 0 END), 0) as total_kartonware_current,
    COALESCE(SUM(CASE WHEN wgp.item_type = 'kartonware' THEN wk.target_number ELSE 0 END), 0) as total_kartonware_target
    
FROM wellen w
LEFT JOIN wellen_displays wd ON w.id = wd.welle_id
LEFT JOIN wellen_kartonware wk ON w.id = wk.welle_id
LEFT JOIN wellen_markets wm ON w.id = wm.welle_id
LEFT JOIN wellen_gl_progress wgp ON w.id = wgp.welle_id
GROUP BY w.id;

-- View: GL-specific progress
CREATE OR REPLACE VIEW wellen_gl_overview AS
SELECT 
    w.id as welle_id,
    w.name as welle_name,
    w.status,
    wgp.gebietsleiter_id,
    u.first_name || ' ' || u.last_name as gebietsleiter_name,
    
    -- Display progress
    COUNT(DISTINCT CASE WHEN wgp.item_type = 'display' THEN wgp.item_id END) as displays_with_progress,
    SUM(CASE WHEN wgp.item_type = 'display' THEN wgp.current_number ELSE 0 END) as displays_current,
    
    -- Kartonware progress
    COUNT(DISTINCT CASE WHEN wgp.item_type = 'kartonware' THEN wgp.item_id END) as kartonware_with_progress,
    SUM(CASE WHEN wgp.item_type = 'kartonware' THEN wgp.current_number ELSE 0 END) as kartonware_current
    
FROM wellen w
INNER JOIN wellen_gl_progress wgp ON w.id = wgp.welle_id
INNER JOIN users u ON wgp.gebietsleiter_id = u.id
GROUP BY w.id, w.name, w.status, wgp.gebietsleiter_id, u.first_name, u.last_name;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL - COMMENT OUT IN PRODUCTION)
-- ============================================================================

-- Insert a test welle
-- INSERT INTO wellen (name, start_date, end_date, status, goal_type, goal_percentage)
-- VALUES ('KW 50-51 Weihnachten', '2025-12-15', '2025-12-28', 'upcoming', 'percentage', 80.00);

-- ============================================================================
-- PERMISSIONS (Adjust based on your RLS policies)
-- ============================================================================

-- Enable RLS
ALTER TABLE wellen ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_kartonware ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_einzelprodukte ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_kw_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_gl_progress ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admins can do everything on wellen" ON wellen
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins can do everything on wellen_displays" ON wellen_displays
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins can do everything on wellen_kartonware" ON wellen_kartonware
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins can do everything on wellen_einzelprodukte" ON wellen_einzelprodukte
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins can do everything on wellen_kw_days" ON wellen_kw_days
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins can do everything on wellen_markets" ON wellen_markets
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- GLs can view wellen assigned to their markets
CREATE POLICY "GLs can view their wellen" ON wellen
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'gl'
        )
        AND EXISTS (
            SELECT 1 FROM wellen_markets wm
            INNER JOIN markets m ON wm.market_id = m.id
            WHERE wm.welle_id = wellen.id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view displays for their wellen
CREATE POLICY "GLs can view displays for their wellen" ON wellen_displays
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wellen_markets wm
            INNER JOIN markets m ON wm.market_id = m.id
            WHERE wm.welle_id = wellen_displays.welle_id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view kartonware for their wellen
CREATE POLICY "GLs can view kartonware for their wellen" ON wellen_kartonware
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wellen_markets wm
            INNER JOIN markets m ON wm.market_id = m.id
            WHERE wm.welle_id = wellen_kartonware.welle_id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view einzelprodukte for their wellen
CREATE POLICY "GLs can view einzelprodukte for their wellen" ON wellen_einzelprodukte
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wellen_markets wm
            INNER JOIN markets m ON wm.market_id = m.id
            WHERE wm.welle_id = wellen_einzelprodukte.welle_id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view KW days for their wellen
CREATE POLICY "GLs can view kw_days for their wellen" ON wellen_kw_days
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wellen_markets wm
            INNER JOIN markets m ON wm.market_id = m.id
            WHERE wm.welle_id = wellen_kw_days.welle_id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view market assignments for their wellen
CREATE POLICY "GLs can view markets for their wellen" ON wellen_markets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM markets m
            WHERE m.id = wellen_markets.market_id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can manage their own progress
CREATE POLICY "GLs can manage their own progress" ON wellen_gl_progress
    FOR ALL USING (gebietsleiter_id = auth.uid());

CREATE POLICY "Admins can do everything on wellen_gl_progress" ON wellen_gl_progress
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- ============================================================================
-- WELLEN SUBMISSIONS TABLE (for logging individual submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
    gebietsleiter_id UUID NOT NULL,
    market_id VARCHAR(50) NOT NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('display', 'kartonware', 'palette', 'schuette', 'einzelprodukt')),
    item_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    value_per_unit DECIMAL(10,2),
    photo_url TEXT,
    delivery_photo_url TEXT, -- Photo taken on follow-up visit to verify delivery
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for wellen_submissions
CREATE INDEX IF NOT EXISTS idx_wellen_submissions_welle ON wellen_submissions(welle_id);
CREATE INDEX IF NOT EXISTS idx_wellen_submissions_gl ON wellen_submissions(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_wellen_submissions_market ON wellen_submissions(market_id);
CREATE INDEX IF NOT EXISTS idx_wellen_submissions_created ON wellen_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_wellen_submissions_delivery_photo 
    ON wellen_submissions(market_id, delivery_photo_url) 
    WHERE delivery_photo_url IS NULL;

-- RLS for wellen_submissions
ALTER TABLE wellen_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GLs can view their own submissions" ON wellen_submissions
    FOR SELECT USING (gebietsleiter_id = auth.uid());

CREATE POLICY "GLs can create their own submissions" ON wellen_submissions
    FOR INSERT WITH CHECK (gebietsleiter_id = auth.uid());

CREATE POLICY "Admins can do everything on wellen_submissions" ON wellen_submissions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

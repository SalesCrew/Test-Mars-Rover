-- ============================================================================
-- WELLEN PHOTOS FEATURE
-- Adds photo collection capability to waves with tagging system
-- ============================================================================

-- Add foto columns to wellen table
ALTER TABLE wellen ADD COLUMN IF NOT EXISTS foto_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE wellen ADD COLUMN IF NOT EXISTS foto_header VARCHAR(255);
ALTER TABLE wellen ADD COLUMN IF NOT EXISTS foto_description TEXT;
ALTER TABLE wellen ADD COLUMN IF NOT EXISTS foto_only BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- PHOTO TAG DEFINITIONS (per wave)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_type VARCHAR(20) NOT NULL CHECK (tag_type IN ('fixed', 'optional')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellen_photo_tags_welle ON wellen_photo_tags(welle_id);

-- ============================================================================
-- PHOTOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wellen_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  welle_id UUID NOT NULL REFERENCES wellen(id) ON DELETE CASCADE,
  gebietsleiter_id UUID NOT NULL,
  market_id VARCHAR(50) NOT NULL,
  photo_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  submission_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellen_photos_welle ON wellen_photos(welle_id);
CREATE INDEX IF NOT EXISTS idx_wellen_photos_gl ON wellen_photos(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_wellen_photos_market ON wellen_photos(market_id);
CREATE INDEX IF NOT EXISTS idx_wellen_photos_created ON wellen_photos(created_at DESC);

-- RLS
ALTER TABLE wellen_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellen_photo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GLs can view photos" ON wellen_photos FOR SELECT USING (true);
CREATE POLICY "GLs can insert own photos" ON wellen_photos FOR INSERT WITH CHECK (gebietsleiter_id = auth.uid());
CREATE POLICY "Admins full access photos" ON wellen_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Anyone can view photo tags" ON wellen_photo_tags FOR SELECT USING (true);
CREATE POLICY "Admins full access photo tags" ON wellen_photo_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

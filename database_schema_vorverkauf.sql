-- ============================================================================
-- VORVERKAUF (Pre-sale/Expired Product Exchange) Schema
-- ============================================================================

-- Main table for vorverkauf entries
-- Note: gebietsleiter_id is UUID, market_id is TEXT to match their respective table id types
CREATE TABLE IF NOT EXISTS vorverkauf_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gebietsleiter_id UUID NOT NULL REFERENCES gebietsleiter(id) ON DELETE CASCADE,
    market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('OOS', 'Listungslücke', 'Platzierung')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for individual items in each vorverkauf entry
-- Note: product_id is TEXT to match products.id type
CREATE TABLE IF NOT EXISTS vorverkauf_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vorverkauf_entry_id UUID NOT NULL REFERENCES vorverkauf_entries(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    item_type VARCHAR(20) DEFAULT 'take_out' CHECK (item_type IN ('take_out', 'replace')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vorverkauf_entries_gl ON vorverkauf_entries(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_entries_market ON vorverkauf_entries(market_id);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_entries_created ON vorverkauf_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_entries_reason ON vorverkauf_entries(reason);
CREATE INDEX IF NOT EXISTS idx_vorverkauf_items_entry ON vorverkauf_items(vorverkauf_entry_id);

-- Enable RLS (Row Level Security)
ALTER TABLE vorverkauf_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vorverkauf_items ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role has full access to vorverkauf_entries" ON vorverkauf_entries
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to vorverkauf_items" ON vorverkauf_items
    FOR ALL USING (true);

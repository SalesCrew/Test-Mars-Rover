-- GL Onboarding Reads Table
-- Tracks which onboarding features each GL has seen

CREATE TABLE gl_onboarding_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gl_id UUID NOT NULL REFERENCES gebietsleiter(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gl_id, feature_key)
);

CREATE INDEX idx_gl_onboarding_reads_gl_id ON gl_onboarding_reads(gl_id);

-- Row Level Security
ALTER TABLE gl_onboarding_reads ENABLE ROW LEVEL SECURITY;

-- Policy: GLs can read their own onboarding status
CREATE POLICY "GLs can view their own onboarding reads" ON gl_onboarding_reads
  FOR SELECT USING (true);

-- Policy: GLs can insert their own onboarding reads
CREATE POLICY "GLs can insert their own onboarding reads" ON gl_onboarding_reads
  FOR INSERT WITH CHECK (true);

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to onboarding reads" ON gl_onboarding_reads
  FOR ALL USING (true);

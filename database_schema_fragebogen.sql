-- ============================================================================
-- FRAGEBOGEN SYSTEM DATABASE SCHEMA
-- ============================================================================
-- Hierarchical structure:
-- Questions (Plants) -> Modules (Bouquets) -> Fragebogen (Packaging)
-- ============================================================================

-- ============================================================================
-- 1. QUESTIONS TABLE (fb_questions)
-- The fundamental reusable unit - stored once, referenced everywhere
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Question type enum
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'single_choice',    -- Single Choice (one answer)
        'yesno',            -- Dichotomous Yes/No
        'likert',           -- Likert Scale (rating)
        'multiple_choice',  -- Multiple Choice (multiple answers)
        'photo_upload',     -- Photo upload with instruction
        'matrix',           -- Matrix (rows with column answers)
        'open_text',        -- Open text answer
        'open_numeric',     -- Numeric input
        'slider',           -- Slider for percentages/values
        'barcode_scanner'   -- Barcode/QR-Code Scanner
    )),
    
    -- Core question data
    question_text TEXT NOT NULL,
    instruction TEXT,  -- Optional instruction (mainly for photo_upload)
    
    -- Template flag: true if this question was created as a reusable template
    is_template BOOLEAN DEFAULT false,
    
    -- Type-specific configurations stored as JSONB
    -- For single_choice, multiple_choice: ["Option 1", "Option 2", ...]
    options JSONB,
    
    -- For likert: {"min": 1, "max": 5, "minLabel": "Sehr schlecht", "maxLabel": "Sehr gut"}
    likert_scale JSONB,
    
    -- For matrix: {"rows": ["Row 1", "Row 2"], "columns": ["Col 1", "Col 2"]}
    matrix_config JSONB,
    
    -- For open_numeric: {"min": 0, "max": 100, "decimals": true}
    numeric_constraints JSONB,
    
    -- For slider: {"min": 0, "max": 100, "step": 1, "unit": "%"}
    slider_config JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    archived BOOLEAN DEFAULT false,
    
    -- Validation constraints
    CONSTRAINT valid_options CHECK (
        (type IN ('single_choice', 'multiple_choice') AND options IS NOT NULL)
        OR type NOT IN ('single_choice', 'multiple_choice')
    ),
    CONSTRAINT valid_likert CHECK (
        (type = 'likert' AND likert_scale IS NOT NULL)
        OR type != 'likert'
    ),
    CONSTRAINT valid_matrix CHECK (
        (type = 'matrix' AND matrix_config IS NOT NULL)
        OR type != 'matrix'
    )
);

-- Indexes for fb_questions
CREATE INDEX IF NOT EXISTS idx_fb_questions_type ON fb_questions(type);
CREATE INDEX IF NOT EXISTS idx_fb_questions_archived ON fb_questions(archived);
CREATE INDEX IF NOT EXISTS idx_fb_questions_is_template ON fb_questions(is_template);
CREATE INDEX IF NOT EXISTS idx_fb_questions_created_at ON fb_questions(created_at DESC);

-- ============================================================================
-- 2. MODULES TABLE (fb_modules)
-- A collection of questions with a name - the "bouquet"
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status
    archived BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for fb_modules
CREATE INDEX IF NOT EXISTS idx_fb_modules_archived ON fb_modules(archived);
CREATE INDEX IF NOT EXISTS idx_fb_modules_created_at ON fb_modules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_modules_name ON fb_modules(name);

-- ============================================================================
-- 3. MODULE-QUESTIONS JUNCTION TABLE (fb_module_questions)
-- Links questions to modules with ordering and required flag
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_module_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    module_id UUID NOT NULL REFERENCES fb_modules(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES fb_questions(id) ON DELETE CASCADE,
    
    -- Ordering within the module
    order_index INTEGER NOT NULL DEFAULT 0,
    
    -- Is this question required in this module context?
    required BOOLEAN DEFAULT true,
    
    -- Local reference ID within module (used for rules/bezüge)
    -- Format: "q1", "q2", etc. - unique within a module
    local_id VARCHAR(50) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique ordering and local_id within a module
    CONSTRAINT unique_module_question UNIQUE (module_id, question_id),
    CONSTRAINT unique_module_order UNIQUE (module_id, order_index),
    CONSTRAINT unique_module_local_id UNIQUE (module_id, local_id)
);

-- Indexes for fb_module_questions
CREATE INDEX IF NOT EXISTS idx_fb_module_questions_module ON fb_module_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_fb_module_questions_question ON fb_module_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_fb_module_questions_order ON fb_module_questions(module_id, order_index);

-- ============================================================================
-- 4. MODULE RULES TABLE (fb_module_rules) - BEZÜGE
-- Conditional logic stored at the module level
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_module_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    module_id UUID NOT NULL REFERENCES fb_modules(id) ON DELETE CASCADE,
    
    -- Which question's answer triggers this rule (uses local_id)
    trigger_local_id VARCHAR(50) NOT NULL,
    
    -- What answer triggers the rule
    trigger_answer TEXT NOT NULL,
    
    -- Comparison operator
    operator VARCHAR(20) NOT NULL DEFAULT 'equals' CHECK (operator IN (
        'equals',
        'not_equals',
        'greater_than',
        'less_than',
        'between',
        'contains'
    )),
    
    -- For 'between' operator: the maximum value
    trigger_answer_max TEXT,
    
    -- What action to take
    action VARCHAR(10) NOT NULL CHECK (action IN ('hide', 'show')),
    
    -- Which questions to affect (array of local_ids)
    target_local_ids TEXT[] NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure trigger_answer_max is set when using 'between' operator
    CONSTRAINT valid_between_operator CHECK (
        (operator = 'between' AND trigger_answer_max IS NOT NULL)
        OR operator != 'between'
    )
);

-- Indexes for fb_module_rules
CREATE INDEX IF NOT EXISTS idx_fb_module_rules_module ON fb_module_rules(module_id);
CREATE INDEX IF NOT EXISTS idx_fb_module_rules_trigger ON fb_module_rules(module_id, trigger_local_id);

-- ============================================================================
-- 5. FRAGEBOGEN TABLE (fb_fragebogen)
-- The final packaged product
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_fragebogen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Time range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status: active, scheduled, inactive
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'active',
        'scheduled',
        'inactive'
    )),
    
    -- Archive status (soft delete)
    archived BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Date validation
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for fb_fragebogen
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_status ON fb_fragebogen(status);
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_archived ON fb_fragebogen(archived);
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_dates ON fb_fragebogen(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_created_at ON fb_fragebogen(created_at DESC);

-- ============================================================================
-- 6. FRAGEBOGEN-MODULES JUNCTION TABLE (fb_fragebogen_modules)
-- Links modules to fragebogen with ordering
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_fragebogen_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    fragebogen_id UUID NOT NULL REFERENCES fb_fragebogen(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES fb_modules(id) ON DELETE CASCADE,
    
    -- Ordering within the fragebogen
    order_index INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique module per fragebogen and unique ordering
    CONSTRAINT unique_fragebogen_module UNIQUE (fragebogen_id, module_id),
    CONSTRAINT unique_fragebogen_order UNIQUE (fragebogen_id, order_index)
);

-- Indexes for fb_fragebogen_modules
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_modules_fragebogen ON fb_fragebogen_modules(fragebogen_id);
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_modules_module ON fb_fragebogen_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_modules_order ON fb_fragebogen_modules(fragebogen_id, order_index);

-- ============================================================================
-- 7. FRAGEBOGEN-MARKETS JUNCTION TABLE (fb_fragebogen_markets)
-- Assigns fragebogen to specific markets
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_fragebogen_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    fragebogen_id UUID NOT NULL REFERENCES fb_fragebogen(id) ON DELETE CASCADE,
    market_id VARCHAR(50) NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    CONSTRAINT unique_fragebogen_market UNIQUE (fragebogen_id, market_id)
);

-- Indexes for fb_fragebogen_markets
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_markets_fragebogen ON fb_fragebogen_markets(fragebogen_id);
CREATE INDEX IF NOT EXISTS idx_fb_fragebogen_markets_market ON fb_fragebogen_markets(market_id);

-- ============================================================================
-- 8. RESPONSES TABLE (fb_responses)
-- Tracks each GL's response to a fragebogen
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    fragebogen_id UUID NOT NULL REFERENCES fb_fragebogen(id) ON DELETE CASCADE,
    gebietsleiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id VARCHAR(50) NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    
    -- Response status
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN (
        'in_progress',
        'completed'
    )),
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate responses for same GL/market/fragebogen
    CONSTRAINT unique_response UNIQUE (fragebogen_id, gebietsleiter_id, market_id)
);

-- Indexes for fb_responses
CREATE INDEX IF NOT EXISTS idx_fb_responses_fragebogen ON fb_responses(fragebogen_id);
CREATE INDEX IF NOT EXISTS idx_fb_responses_gl ON fb_responses(gebietsleiter_id);
CREATE INDEX IF NOT EXISTS idx_fb_responses_market ON fb_responses(market_id);
CREATE INDEX IF NOT EXISTS idx_fb_responses_status ON fb_responses(status);
CREATE INDEX IF NOT EXISTS idx_fb_responses_completed ON fb_responses(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- 9. RESPONSE ANSWERS TABLE (fb_response_answers)
-- Individual answers to questions within a response
-- ============================================================================
CREATE TABLE IF NOT EXISTS fb_response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    response_id UUID NOT NULL REFERENCES fb_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES fb_questions(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES fb_modules(id) ON DELETE CASCADE,
    
    -- Answer storage - use appropriate field based on question type
    -- For open_text, single_choice, yesno, barcode_scanner
    answer_text TEXT,
    
    -- For open_numeric, slider, likert
    answer_numeric DECIMAL(15, 4),
    
    -- For multiple_choice (array of selected options), matrix (2D array)
    answer_json JSONB,
    
    -- For photo_upload
    answer_file_url TEXT,
    
    -- Timestamp
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate answers for same question in same response
    CONSTRAINT unique_response_answer UNIQUE (response_id, question_id, module_id)
);

-- Indexes for fb_response_answers
CREATE INDEX IF NOT EXISTS idx_fb_response_answers_response ON fb_response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_fb_response_answers_question ON fb_response_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_fb_response_answers_module ON fb_response_answers(module_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fb_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_fb_questions_updated_at 
    BEFORE UPDATE ON fb_questions
    FOR EACH ROW EXECUTE FUNCTION update_fb_updated_at_column();

CREATE TRIGGER update_fb_modules_updated_at 
    BEFORE UPDATE ON fb_modules
    FOR EACH ROW EXECUTE FUNCTION update_fb_updated_at_column();

CREATE TRIGGER update_fb_fragebogen_updated_at 
    BEFORE UPDATE ON fb_fragebogen
    FOR EACH ROW EXECUTE FUNCTION update_fb_updated_at_column();

-- ============================================================================
-- FUNCTION TO AUTO-UPDATE FRAGEBOGEN STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_fragebogen_status()
RETURNS void AS $$
BEGIN
    -- Update to 'inactive' if end_date has passed
    UPDATE fb_fragebogen
    SET status = 'inactive'
    WHERE status != 'inactive' 
    AND archived = false
    AND end_date < CURRENT_DATE;
    
    -- Update to 'active' if start_date has arrived and end_date hasn't passed
    UPDATE fb_fragebogen
    SET status = 'active'
    WHERE status = 'scheduled'
    AND archived = false
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR STATISTICS
-- ============================================================================

-- View: Module overview with question count and usage stats
CREATE OR REPLACE VIEW fb_modules_overview AS
SELECT 
    m.id,
    m.name,
    m.description,
    m.archived,
    m.created_at,
    m.updated_at,
    COUNT(DISTINCT mq.question_id) as question_count,
    COUNT(DISTINCT mr.id) as rules_count,
    COUNT(DISTINCT fm.fragebogen_id) as fragebogen_usage_count
FROM fb_modules m
LEFT JOIN fb_module_questions mq ON m.id = mq.module_id
LEFT JOIN fb_module_rules mr ON m.id = mr.module_id
LEFT JOIN fb_fragebogen_modules fm ON m.id = fm.module_id
GROUP BY m.id;

-- View: Fragebogen overview with aggregated stats
CREATE OR REPLACE VIEW fb_fragebogen_overview AS
SELECT 
    f.id,
    f.name,
    f.description,
    f.start_date,
    f.end_date,
    f.status,
    f.archived,
    f.created_at,
    f.updated_at,
    COUNT(DISTINCT fm.module_id) as module_count,
    COUNT(DISTINCT fmk.market_id) as market_count,
    COUNT(DISTINCT r.id) as response_count,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_response_count
FROM fb_fragebogen f
LEFT JOIN fb_fragebogen_modules fm ON f.id = fm.fragebogen_id
LEFT JOIN fb_fragebogen_markets fmk ON f.id = fmk.fragebogen_id
LEFT JOIN fb_responses r ON f.id = r.fragebogen_id
GROUP BY f.id;

-- View: Question usage stats
CREATE OR REPLACE VIEW fb_questions_usage AS
SELECT 
    q.id,
    q.type,
    q.question_text,
    q.is_template,
    q.archived,
    q.created_at,
    COUNT(DISTINCT mq.module_id) as module_usage_count,
    COUNT(DISTINCT ra.id) as answer_count
FROM fb_questions q
LEFT JOIN fb_module_questions mq ON q.id = mq.question_id
LEFT JOIN fb_response_answers ra ON q.id = ra.question_id
GROUP BY q.id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE fb_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_module_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_module_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_fragebogen ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_fragebogen_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_fragebogen_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_response_answers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADMIN POLICIES - Full access for admins
-- ============================================================================

CREATE POLICY "Admins full access on fb_questions" ON fb_questions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_modules" ON fb_modules
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_module_questions" ON fb_module_questions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_module_rules" ON fb_module_rules
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_fragebogen" ON fb_fragebogen
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_fragebogen_modules" ON fb_fragebogen_modules
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_fragebogen_markets" ON fb_fragebogen_markets
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_responses" ON fb_responses
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Admins full access on fb_response_answers" ON fb_response_answers
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- ============================================================================
-- GL POLICIES - Read access to assigned fragebogen, full access to own responses
-- ============================================================================

-- GLs can view active fragebogen assigned to their markets
CREATE POLICY "GLs can view assigned fragebogen" ON fb_fragebogen
    FOR SELECT USING (
        status = 'active'
        AND archived = false
        AND EXISTS (
            SELECT 1 FROM fb_fragebogen_markets fm
            INNER JOIN markets m ON fm.market_id = m.id
            WHERE fm.fragebogen_id = fb_fragebogen.id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view modules in their assigned fragebogen
CREATE POLICY "GLs can view modules in assigned fragebogen" ON fb_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fb_fragebogen_modules fm
            INNER JOIN fb_fragebogen f ON fm.fragebogen_id = f.id
            INNER JOIN fb_fragebogen_markets fmk ON f.id = fmk.fragebogen_id
            INNER JOIN markets m ON fmk.market_id = m.id
            WHERE fm.module_id = fb_modules.id
            AND f.status = 'active'
            AND f.archived = false
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view questions in their assigned modules
CREATE POLICY "GLs can view questions in assigned modules" ON fb_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fb_module_questions mq
            INNER JOIN fb_fragebogen_modules fm ON mq.module_id = fm.module_id
            INNER JOIN fb_fragebogen f ON fm.fragebogen_id = f.id
            INNER JOIN fb_fragebogen_markets fmk ON f.id = fmk.fragebogen_id
            INNER JOIN markets m ON fmk.market_id = m.id
            WHERE mq.question_id = fb_questions.id
            AND f.status = 'active'
            AND f.archived = false
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view module_questions for their modules
CREATE POLICY "GLs can view module_questions in assigned modules" ON fb_module_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fb_fragebogen_modules fm
            INNER JOIN fb_fragebogen f ON fm.fragebogen_id = f.id
            INNER JOIN fb_fragebogen_markets fmk ON f.id = fmk.fragebogen_id
            INNER JOIN markets m ON fmk.market_id = m.id
            WHERE fm.module_id = fb_module_questions.module_id
            AND f.status = 'active'
            AND f.archived = false
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view rules for their modules
CREATE POLICY "GLs can view module_rules in assigned modules" ON fb_module_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fb_fragebogen_modules fm
            INNER JOIN fb_fragebogen f ON fm.fragebogen_id = f.id
            INNER JOIN fb_fragebogen_markets fmk ON f.id = fmk.fragebogen_id
            INNER JOIN markets m ON fmk.market_id = m.id
            WHERE fm.module_id = fb_module_rules.module_id
            AND f.status = 'active'
            AND f.archived = false
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view fragebogen_modules for their fragebogen
CREATE POLICY "GLs can view fragebogen_modules for assigned fragebogen" ON fb_fragebogen_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fb_fragebogen f
            INNER JOIN fb_fragebogen_markets fmk ON f.id = fmk.fragebogen_id
            INNER JOIN markets m ON fmk.market_id = m.id
            WHERE fb_fragebogen_modules.fragebogen_id = f.id
            AND f.status = 'active'
            AND f.archived = false
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can view fragebogen_markets for their fragebogen
CREATE POLICY "GLs can view fragebogen_markets for assigned fragebogen" ON fb_fragebogen_markets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM markets m
            WHERE fb_fragebogen_markets.market_id = m.id
            AND m.gebietsleiter_id = auth.uid()::text
        )
    );

-- GLs can manage their own responses
CREATE POLICY "GLs can manage own responses" ON fb_responses
    FOR ALL USING (gebietsleiter_id = auth.uid());

-- GLs can manage their own response answers
CREATE POLICY "GLs can manage own response_answers" ON fb_response_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM fb_responses r
            WHERE r.id = fb_response_answers.response_id
            AND r.gebietsleiter_id = auth.uid()
        )
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON fb_modules_overview TO authenticated;
GRANT SELECT ON fb_fragebogen_overview TO authenticated;
GRANT SELECT ON fb_questions_usage TO authenticated;

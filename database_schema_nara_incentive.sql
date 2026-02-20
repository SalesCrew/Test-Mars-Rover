CREATE TABLE nara_incentive_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gebietsleiter_id UUID NOT NULL REFERENCES gebietsleiter(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE nara_incentive_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES nara_incentive_submissions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

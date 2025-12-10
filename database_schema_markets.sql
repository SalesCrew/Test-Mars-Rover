-- ============================================
-- Mars Rover Admin - Markets Database Schema
-- ============================================

CREATE TABLE IF NOT EXISTS markets (
  -- Primary identification
  id VARCHAR(50) PRIMARY KEY,
  internal_id VARCHAR(50) NOT NULL UNIQUE,
  
  -- Basic market information
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  chain VARCHAR(100),
  
  -- Contact information
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Organizational structure
  gebietsleiter VARCHAR(100),
  channel VARCHAR(100),
  banner VARCHAR(100),
  branch VARCHAR(100),
  maingroup VARCHAR(100),
  subgroup VARCHAR(100),
  
  -- Visit information
  frequency INTEGER DEFAULT 12,
  current_visits INTEGER DEFAULT 0,
  visit_day VARCHAR(50),
  visit_duration VARCHAR(50),
  last_visit_date DATE,
  
  -- Classification
  customer_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  
  -- Location coordinates (optional)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  INDEX idx_gebietsleiter (gebietsleiter),
  INDEX idx_chain (chain),
  INDEX idx_is_active (is_active),
  INDEX idx_subgroup (subgroup),
  INDEX idx_city (city)
);

-- ============================================
-- Trigger to update updated_at timestamp
-- ============================================
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_markets_timestamp
BEFORE UPDATE ON markets
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- ============================================
-- Sample data (optional - for testing)
-- ============================================
-- Uncomment below to insert sample data

/*
INSERT INTO markets (
  id, internal_id, name, address, city, postal_code, chain,
  gebietsleiter, is_active, frequency, subgroup
) VALUES
  ('MKT-001', 'MKT-001', 'Billa+ Hauptstraße', 'Hauptstraße 45', 'Wien', '1010', 'Billa+', 'Max Mustermann', true, 12, '3R - BILLA Plus'),
  ('MKT-002', 'MKT-002', 'Spar Mariahilfer Straße', 'Mariahilfer Straße 123', 'Wien', '1060', 'Spar', 'Anna Schmidt', true, 24, '2A - Spar'),
  ('MKT-003', 'MKT-003', 'Adeg Leopoldstadt', 'Taborstraße 67', 'Wien', '1020', 'Adeg', 'Peter Weber', true, 12, '3F - Adeg');
*/


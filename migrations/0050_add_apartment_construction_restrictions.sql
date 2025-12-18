-- Migration 0050: Add apartment construction restriction fields
-- Target: Support development guideline regulations (parking/bicycle parking requirements)
-- Version: v3.153.135
-- Date: 2025-12-18

-- Strategy:
-- 1. Add fields for apartment construction restrictions
-- 2. Include parking/bicycle parking requirements from development guidelines
-- 3. Support detailed calculation for apartment feasibility

-- Add new columns to building_regulations table
ALTER TABLE building_regulations ADD COLUMN apartment_restrictions TEXT;
ALTER TABLE building_regulations ADD COLUMN apartment_restrictions_note TEXT;

-- Parking requirements for apartments
ALTER TABLE building_regulations ADD COLUMN apartment_parking_ratio REAL;  -- e.g., 0.5 means 1 space per 2 units
ALTER TABLE building_regulations ADD COLUMN apartment_parking_area_per_space REAL;  -- m² per parking space
ALTER TABLE building_regulations ADD COLUMN apartment_parking_note TEXT;

-- Bicycle parking requirements for apartments
ALTER TABLE building_regulations ADD COLUMN apartment_bicycle_ratio REAL;  -- e.g., 1.0 means 1 space per unit
ALTER TABLE building_regulations ADD COLUMN apartment_bicycle_area_per_space REAL;  -- m² per bicycle space
ALTER TABLE building_regulations ADD COLUMN apartment_bicycle_note TEXT;

-- General apartment construction feasibility
ALTER TABLE building_regulations ADD COLUMN apartment_construction_feasible INTEGER DEFAULT 1;  -- 1=feasible, 0=not feasible
ALTER TABLE building_regulations ADD COLUMN apartment_infeasibility_reason TEXT;  -- Reason if not feasible

-- Development guideline information
ALTER TABLE building_regulations ADD COLUMN development_guideline TEXT;  -- Name of the guideline
ALTER TABLE building_regulations ADD COLUMN development_guideline_url TEXT;  -- URL to the guideline document

-- Verify the schema update
SELECT 'Schema update complete' as status;

-- Show updated table structure
PRAGMA table_info(building_regulations);

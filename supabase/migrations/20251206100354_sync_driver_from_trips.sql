-- DRIVER ASSIGNMENT RULE UPDATE: Sync driver_id from trips to loads
-- This migration ensures database consistency after the refactor where
-- drivers are assigned at the trip level and inherited by loads.
--
-- Rules:
-- 1. For all loads where trip_id IS NOT NULL: driver_id = trip.driver_id
-- 2. For all loads where trip_id IS NULL: driver_id = NULL

-- Step 1: Sync driver from trips to all loads that are on trips
-- Uses trip_loads join table to find loads and their associated trips
UPDATE loads l
SET
    assigned_driver_id = t.driver_id,
    assigned_driver_name = CASE
        WHEN t.driver_id IS NOT NULL AND COALESCE(t.share_driver_with_companies, true) = true
        THEN (SELECT first_name || ' ' || last_name FROM drivers WHERE id = t.driver_id)
        ELSE NULL
    END,
    assigned_driver_phone = CASE
        WHEN t.driver_id IS NOT NULL AND COALESCE(t.share_driver_with_companies, true) = true
        THEN (SELECT phone FROM drivers WHERE id = t.driver_id)
        ELSE NULL
    END,
    updated_at = now()
FROM trip_loads tl
JOIN trips t ON t.id = tl.trip_id
WHERE l.id = tl.load_id
AND l.trip_id IS NOT NULL;

-- Step 2: Clear driver from all loads that are NOT on a trip
-- These loads should not have a driver assigned directly
UPDATE loads
SET
    assigned_driver_id = NULL,
    assigned_driver_name = NULL,
    assigned_driver_phone = NULL,
    updated_at = now()
WHERE trip_id IS NULL
AND assigned_driver_id IS NOT NULL;

-- Log the number of records updated
DO $$
DECLARE
    synced_count INTEGER;
    cleared_count INTEGER;
BEGIN
    -- Count loads synced from trips
    SELECT COUNT(*) INTO synced_count
    FROM loads l
    JOIN trip_loads tl ON l.id = tl.load_id
    WHERE l.trip_id IS NOT NULL;

    -- Count loads that had driver cleared
    SELECT COUNT(*) INTO cleared_count
    FROM loads
    WHERE trip_id IS NULL
    AND assigned_driver_id IS NULL;

    RAISE NOTICE 'Driver assignment migration complete. Loads on trips: %, Loads with driver cleared: %', synced_count, cleared_count;
END $$;

COMMENT ON COLUMN loads.assigned_driver_id IS 'Driver assigned to this load. INHERITED from trip.driver_id when load is on a trip. Should be NULL if trip_id is NULL.';
COMMENT ON COLUMN loads.assigned_driver_name IS 'Driver name for display. INHERITED from trip driver when load is on a trip.';
COMMENT ON COLUMN loads.assigned_driver_phone IS 'Driver phone for contact. INHERITED from trip driver when load is on a trip.';


-- EQUIPMENT INHERITANCE: Sync truck_id and trailer_id from trips to loads
-- This migration ensures database consistency after the refactor where
-- equipment (truck/trailer) is assigned at the trip level and inherited by loads.
--
-- Rules:
-- 1. For all loads where trip_id IS NOT NULL: equipment = trip's equipment
-- 2. For all loads where trip_id IS NULL: equipment = NULL

-- Step 1: Sync equipment from trips to all loads that are on trips
-- Uses trip_loads join table to find loads and their associated trips
UPDATE loads l
SET
    assigned_truck_id = t.truck_id,
    assigned_trailer_id = t.trailer_id,
    updated_at = now()
FROM trip_loads tl
JOIN trips t ON t.id = tl.trip_id
WHERE l.id = tl.load_id
AND l.trip_id IS NOT NULL;

-- Step 2: Clear equipment from all loads that are NOT on a trip
-- These loads should not have equipment assigned directly
UPDATE loads
SET
    assigned_truck_id = NULL,
    assigned_trailer_id = NULL,
    updated_at = now()
WHERE trip_id IS NULL
AND (assigned_truck_id IS NOT NULL OR assigned_trailer_id IS NOT NULL);

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

    -- Count loads that had equipment cleared
    SELECT COUNT(*) INTO cleared_count
    FROM loads
    WHERE trip_id IS NULL
    AND assigned_truck_id IS NULL
    AND assigned_trailer_id IS NULL;

    RAISE NOTICE 'Equipment inheritance migration complete. Loads on trips: %, Loads with equipment cleared: %', synced_count, cleared_count;
END $$;

COMMENT ON COLUMN loads.assigned_truck_id IS 'Truck assigned to this load. INHERITED from trip.truck_id when load is on a trip. Should be NULL if trip_id is NULL.';
COMMENT ON COLUMN loads.assigned_trailer_id IS 'Trailer assigned to this load. INHERITED from trip.trailer_id when load is on a trip. Should be NULL if trip_id is NULL.';


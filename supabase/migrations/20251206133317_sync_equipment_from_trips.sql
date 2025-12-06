-- EQUIPMENT INHERITANCE: Sync truck_id and trailer_id from trips to loads
-- This migration ensures database consistency after the refactor where
-- equipment (truck/trailer) is assigned at the trip level and inherited by loads.
--
-- Rules:
-- 1. For all loads that are in trip_loads: equipment = trip's equipment
-- 2. For all loads that are NOT in trip_loads: equipment = NULL
--
-- IMPORTANT: trip_loads is the source of truth for which loads belong to which trip.
-- Do NOT rely on loads.trip_id column.

-- Step 1: Sync equipment from trips to all loads that are part of a trip
-- Use trip_loads as the source of truth, NOT loads.trip_id
UPDATE loads l
SET
    assigned_truck_id = t.truck_id,
    assigned_trailer_id = t.trailer_id,
    updated_at = now()
FROM trip_loads tl
JOIN trips t ON t.id = tl.trip_id
WHERE l.id = tl.load_id;

-- Step 2: Clear equipment from loads that are NOT on any trip
-- Again, use trip_loads as the source of truth
UPDATE loads l
SET
    assigned_truck_id = NULL,
    assigned_trailer_id = NULL,
    updated_at = now()
WHERE NOT EXISTS (
    SELECT 1
    FROM trip_loads tl
    WHERE tl.load_id = l.id
)
AND (l.assigned_truck_id IS NOT NULL OR l.assigned_trailer_id IS NOT NULL);

-- Log the number of records updated
DO $$
DECLARE
    synced_count INTEGER;
    cleared_count INTEGER;
BEGIN
    -- Count loads synced from trips (using trip_loads as source of truth)
    SELECT COUNT(*) INTO synced_count
    FROM loads l
    JOIN trip_loads tl ON l.id = tl.load_id;

    -- Count loads that had equipment cleared (not in trip_loads)
    SELECT COUNT(*) INTO cleared_count
    FROM loads l
    WHERE NOT EXISTS (
        SELECT 1
        FROM trip_loads tl
        WHERE tl.load_id = l.id
    )
    AND l.assigned_truck_id IS NULL
    AND l.assigned_trailer_id IS NULL;

    RAISE NOTICE 'Equipment inheritance migration complete. Loads on trips: %, Loads with equipment cleared: %', synced_count, cleared_count;
END $$;

COMMENT ON COLUMN loads.assigned_truck_id IS 'Truck assigned to this load. INHERITED from trip.truck_id when load is in trip_loads. Should be NULL if load is not in trip_loads.';
COMMENT ON COLUMN loads.assigned_trailer_id IS 'Trailer assigned to this load. INHERITED from trip.trailer_id when load is in trip_loads. Should be NULL if load is not in trip_loads.';


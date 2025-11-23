-- Add vehicle_type column to trucks table
ALTER TABLE public.trucks
ADD COLUMN IF NOT EXISTS vehicle_type text;


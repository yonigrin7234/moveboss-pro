-- Vehicle document photo URLs and expiration dates
-- For drivers to access registration, insurance, IFTA, etc. at weigh stations

-- TRUCKS: Add document photo URLs
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS registration_photo_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_photo_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS ifta_photo_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS ifta_expiry DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS inspection_photo_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS permit_photo_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS permit_expiry DATE;
-- TRAILERS: Add document photo URLs
ALTER TABLE trailers ADD COLUMN IF NOT EXISTS registration_photo_url TEXT;
ALTER TABLE trailers ADD COLUMN IF NOT EXISTS inspection_photo_url TEXT;
-- Add comments for documentation
COMMENT ON COLUMN trucks.registration_photo_url IS 'Photo of truck registration document';
COMMENT ON COLUMN trucks.registration_expiry IS 'Expiration date of registration';
COMMENT ON COLUMN trucks.insurance_photo_url IS 'Photo of insurance card/certificate';
COMMENT ON COLUMN trucks.insurance_expiry IS 'Expiration date of insurance';
COMMENT ON COLUMN trucks.ifta_photo_url IS 'Photo of IFTA permit sticker';
COMMENT ON COLUMN trucks.ifta_expiry IS 'Expiration date of IFTA permit';
COMMENT ON COLUMN trucks.inspection_photo_url IS 'Photo of annual inspection sticker';
COMMENT ON COLUMN trucks.inspection_expiry IS 'Expiration date of annual inspection';
COMMENT ON COLUMN trucks.permit_photo_url IS 'Photo of operating authority/MC permit';
COMMENT ON COLUMN trucks.permit_expiry IS 'Expiration date of operating permit';
COMMENT ON COLUMN trailers.registration_photo_url IS 'Photo of trailer registration document';
COMMENT ON COLUMN trailers.registration_expiry IS 'Expiration date of registration';
COMMENT ON COLUMN trailers.inspection_photo_url IS 'Photo of annual inspection sticker';
COMMENT ON COLUMN trailers.inspection_expiry IS 'Expiration date of annual inspection';

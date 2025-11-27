-- Add email column to profiles (needed for onboarding trigger and auth callback)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Name Normalization Triggers & Data Migration
-- Ensures all names are properly title-cased before storage
-- Also migrates existing data to be normalized
-- This serves as a safety net in case application-level validation is bypassed

-- Helper function to title-case a name
-- Handles special prefixes like Mc, Mac, O'
CREATE OR REPLACE FUNCTION normalize_name(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result TEXT := '';
    word TEXT;
    lower_word TEXT;
    prefix TEXT;
    special_prefixes TEXT[] := ARRAY['mc', 'mac', 'o'''];
    is_special BOOLEAN;
    words TEXT[];
    i INT;
BEGIN
    IF name IS NULL OR TRIM(name) = '' THEN
        RETURN name;
    END IF;

    -- Split by spaces
    words := regexp_split_to_array(TRIM(name), '\s+');

    FOR i IN 1..array_length(words, 1) LOOP
        word := words[i];
        lower_word := LOWER(word);
        is_special := FALSE;

        -- Check for special prefixes
        FOREACH prefix IN ARRAY special_prefixes LOOP
            IF lower_word LIKE prefix || '%' AND LENGTH(lower_word) > LENGTH(prefix) THEN
                -- Handle special prefix: McXxx, MacXxx, O'Xxx
                word := INITCAP(prefix) || UPPER(SUBSTR(lower_word, LENGTH(prefix) + 1, 1)) || SUBSTR(lower_word, LENGTH(prefix) + 2);
                is_special := TRUE;
                EXIT;
            END IF;
        END LOOP;

        IF NOT is_special THEN
            -- Standard title case
            word := INITCAP(lower_word);
        END IF;

        -- Handle hyphenated names
        IF word LIKE '%-%' THEN
            word := array_to_string(
                ARRAY(
                    SELECT INITCAP(part)
                    FROM unnest(string_to_array(word, '-')) AS part
                ),
                '-'
            );
        END IF;

        IF i = 1 THEN
            result := word;
        ELSE
            result := result || ' ' || word;
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- Helper function to normalize company names
-- Preserves uppercase suffixes like LLC, INC, CORP
CREATE OR REPLACE FUNCTION normalize_company_name(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result TEXT := '';
    word TEXT;
    upper_word TEXT;
    uppercase_suffixes TEXT[] := ARRAY['LLC', 'INC', 'CORP', 'LTD', 'LP', 'LLP', 'PC', 'PA', 'PLLC', 'CO', 'DBA'];
    words TEXT[];
    i INT;
BEGIN
    IF name IS NULL OR TRIM(name) = '' THEN
        RETURN name;
    END IF;

    -- Split by spaces
    words := regexp_split_to_array(TRIM(name), '\s+');

    FOR i IN 1..array_length(words, 1) LOOP
        word := words[i];
        upper_word := UPPER(REGEXP_REPLACE(word, '[.,]', '', 'g'));

        -- Check if this is an uppercase suffix
        IF upper_word = ANY(uppercase_suffixes) THEN
            word := UPPER(word);
        ELSE
            -- Apply standard name formatting
            word := normalize_name(word);
        END IF;

        IF i = 1 THEN
            result := word;
        ELSE
            result := result || ' ' || word;
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- Trigger function for drivers table
CREATE OR REPLACE FUNCTION normalize_driver_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.first_name IS NOT NULL THEN
        NEW.first_name := normalize_name(NEW.first_name);
    END IF;
    IF NEW.last_name IS NOT NULL THEN
        NEW.last_name := normalize_name(NEW.last_name);
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger function for companies table
CREATE OR REPLACE FUNCTION normalize_company_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.name IS NOT NULL THEN
        NEW.name := normalize_company_name(NEW.name);
    END IF;
    IF NEW.legal_name IS NOT NULL THEN
        NEW.legal_name := normalize_company_name(NEW.legal_name);
    END IF;
    IF NEW.dba_name IS NOT NULL THEN
        NEW.dba_name := normalize_company_name(NEW.dba_name);
    END IF;
    IF NEW.primary_contact_name IS NOT NULL THEN
        NEW.primary_contact_name := normalize_name(NEW.primary_contact_name);
    END IF;
    IF NEW.dispatch_contact_name IS NOT NULL THEN
        NEW.dispatch_contact_name := normalize_name(NEW.dispatch_contact_name);
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger function for profiles table
CREATE OR REPLACE FUNCTION normalize_profile_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.full_name IS NOT NULL THEN
        NEW.full_name := normalize_name(NEW.full_name);
    END IF;
    RETURN NEW;
END;
$$;

-- Create triggers (drop if exists first to allow re-running)
DROP TRIGGER IF EXISTS normalize_driver_names_trigger ON drivers;
CREATE TRIGGER normalize_driver_names_trigger
    BEFORE INSERT OR UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION normalize_driver_names();

DROP TRIGGER IF EXISTS normalize_company_names_trigger ON companies;
CREATE TRIGGER normalize_company_names_trigger
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION normalize_company_names();

DROP TRIGGER IF EXISTS normalize_profile_names_trigger ON profiles;
CREATE TRIGGER normalize_profile_names_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION normalize_profile_names();

-- Add helpful comments
COMMENT ON FUNCTION normalize_name(TEXT) IS 'Title-cases a name, handling special prefixes like Mc, Mac, O''';
COMMENT ON FUNCTION normalize_company_name(TEXT) IS 'Title-cases a company name, preserving uppercase suffixes like LLC, INC, CORP';
COMMENT ON TRIGGER normalize_driver_names_trigger ON drivers IS 'Ensures driver names are properly title-cased';
COMMENT ON TRIGGER normalize_company_names_trigger ON companies IS 'Ensures company names are properly title-cased';
COMMENT ON TRIGGER normalize_profile_names_trigger ON profiles IS 'Ensures profile names are properly title-cased';

-- ============================================================================
-- DATA MIGRATION: Normalize all existing records
-- ============================================================================

-- Normalize existing driver names
UPDATE drivers
SET
    first_name = normalize_name(first_name),
    last_name = normalize_name(last_name)
WHERE
    first_name IS NOT NULL
    OR last_name IS NOT NULL;

-- Normalize existing company names
UPDATE companies
SET
    name = normalize_company_name(name),
    legal_name = normalize_company_name(legal_name),
    dba_name = normalize_company_name(dba_name),
    primary_contact_name = normalize_name(primary_contact_name),
    dispatch_contact_name = normalize_name(dispatch_contact_name)
WHERE
    name IS NOT NULL
    OR legal_name IS NOT NULL
    OR dba_name IS NOT NULL
    OR primary_contact_name IS NOT NULL
    OR dispatch_contact_name IS NOT NULL;

-- Normalize existing profile names
UPDATE profiles
SET full_name = normalize_name(full_name)
WHERE full_name IS NOT NULL;

-- Log the migration
DO $$
DECLARE
    driver_count INT;
    company_count INT;
    profile_count INT;
BEGIN
    SELECT COUNT(*) INTO driver_count FROM drivers;
    SELECT COUNT(*) INTO company_count FROM companies;
    SELECT COUNT(*) INTO profile_count FROM profiles;

    RAISE NOTICE 'Name normalization complete: % drivers, % companies, % profiles',
        driver_count, company_count, profile_count;
END $$;

-- ============================================================================
-- LOAD SHARING SYSTEM - Complete Database Schema
-- ============================================================================
-- This migration creates all tables and columns needed for the load sharing
-- system including public load boards, batch share links, and analytics.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: COMPANY SHARING SETTINGS
-- ============================================================================
-- Adding columns to companies table for public board configuration

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS public_board_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_board_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_board_show_rates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_board_show_contact BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_board_require_auth_to_claim BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_board_custom_message TEXT,
  ADD COLUMN IF NOT EXISTS public_board_logo_url TEXT;

-- Create index for slug lookups (public facing)
CREATE INDEX IF NOT EXISTS idx_companies_public_board_slug
  ON public.companies(public_board_slug)
  WHERE public_board_enabled = true AND public_board_slug IS NOT NULL;

-- ============================================================================
-- PHASE 2: LOAD SHARE LINKS TABLE
-- ============================================================================
-- Stores batch share links for multiple loads

CREATE TABLE IF NOT EXISTS public.load_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  load_ids UUID[] NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for token lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_load_share_links_token
  ON public.load_share_links(token)
  WHERE is_active = true;

-- Index for company's share links
CREATE INDEX IF NOT EXISTS idx_load_share_links_company
  ON public.load_share_links(company_id, created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_load_share_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_load_share_links_updated_at ON public.load_share_links;
CREATE TRIGGER set_load_share_links_updated_at
  BEFORE UPDATE ON public.load_share_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_share_links_updated_at();

-- ============================================================================
-- PHASE 8: SHARE ANALYTICS TABLE
-- ============================================================================
-- Tracks sharing events, views, and claim attempts

CREATE TABLE IF NOT EXISTS public.share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('single_load', 'batch_link', 'public_board')),
  load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL,
  batch_token TEXT,
  channel TEXT CHECK (channel IN ('whatsapp', 'email', 'copy_link', 'qr_code', 'direct', NULL)),
  action TEXT NOT NULL CHECK (action IN ('share_generated', 'link_copied', 'message_copied', 'public_view', 'claim_click', 'claim_submitted')),
  viewer_ip TEXT,
  viewer_user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analytics queries by company
CREATE INDEX IF NOT EXISTS idx_share_analytics_company
  ON public.share_analytics(company_id, created_at DESC);

-- Index for analytics by load
CREATE INDEX IF NOT EXISTS idx_share_analytics_load
  ON public.share_analytics(load_id, created_at DESC)
  WHERE load_id IS NOT NULL;

-- Index for batch token analytics
CREATE INDEX IF NOT EXISTS idx_share_analytics_batch
  ON public.share_analytics(batch_token, created_at DESC)
  WHERE batch_token IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.load_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;

-- Load Share Links Policies
-- Company members can view and manage their own share links
DROP POLICY IF EXISTS "Company members can view their share links" ON public.load_share_links;
CREATE POLICY "Company members can view their share links"
  ON public.load_share_links
  FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_memberships cm
      WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company members can create share links" ON public.load_share_links;
CREATE POLICY "Company members can create share links"
  ON public.load_share_links
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT cm.company_id FROM public.company_memberships cm
      WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company members can update their share links" ON public.load_share_links;
CREATE POLICY "Company members can update their share links"
  ON public.load_share_links
  FOR UPDATE
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_memberships cm
      WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company members can delete their share links" ON public.load_share_links;
CREATE POLICY "Company members can delete their share links"
  ON public.load_share_links
  FOR DELETE
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_memberships cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- Share Analytics Policies
-- Company members can view their own analytics
DROP POLICY IF EXISTS "Company members can view their analytics" ON public.share_analytics;
CREATE POLICY "Company members can view their analytics"
  ON public.share_analytics
  FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_memberships cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- Allow insert for analytics tracking (more permissive for public views)
DROP POLICY IF EXISTS "Allow analytics tracking" ON public.share_analytics;
CREATE POLICY "Allow analytics tracking"
  ON public.share_analytics
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Generate URL-safe slug from company name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_company_slug(company_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(
    regexp_replace(company_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));

  -- Remove consecutive hyphens and trim
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Truncate to reasonable length
  IF length(base_slug) > 50 THEN
    base_slug := left(base_slug, 50);
    base_slug := trim(both '-' from base_slug);
  END IF;

  -- Check uniqueness and add suffix if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.companies WHERE public_board_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Generate secure token for share links
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
BEGIN
  -- Generate a URL-safe token using gen_random_uuid and encode
  new_token := encode(gen_random_bytes(16), 'hex');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.load_share_links WHERE token = new_token) LOOP
    new_token := encode(gen_random_bytes(16), 'hex');
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTO-GENERATE SLUG ON COMPANY CREATE (if not set)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_company_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if public_board_enabled is true and slug is not set
  IF NEW.public_board_slug IS NULL AND NEW.name IS NOT NULL THEN
    NEW.public_board_slug := public.generate_company_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_company_slug_trigger ON public.companies;
CREATE TRIGGER auto_generate_company_slug_trigger
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_company_slug();

-- Generate slugs for existing companies that don't have one
UPDATE public.companies
SET public_board_slug = public.generate_company_slug(name)
WHERE public_board_slug IS NULL AND name IS NOT NULL;

COMMIT;

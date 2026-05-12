
-- Custom domain / wildcard subdomain support per tenant
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS domain_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_domain_unique_ci
  ON public.tenants (lower(domain))
  WHERE domain IS NOT NULL AND length(trim(domain)) > 0;

-- Resolve a tenant from a request hostname.
-- Match priority: exact custom domain, then slug parsed from leftmost subdomain label.
CREATE OR REPLACE FUNCTION public.get_tenant_by_host(_host text)
RETURNS TABLE(id uuid, name text, slug text, domain text, domain_verified_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH h AS (
    SELECT lower(coalesce(_host, '')) AS host
  ),
  exact AS (
    SELECT t.id, t.name, t.slug, t.domain, t.domain_verified_at
    FROM public.tenants t, h
    WHERE t.domain IS NOT NULL
      AND lower(t.domain) = h.host
    LIMIT 1
  ),
  by_sub AS (
    SELECT t.id, t.name, t.slug, t.domain, t.domain_verified_at
    FROM public.tenants t, h
    WHERE t.slug IS NOT NULL
      AND position('.' in h.host) > 0
      AND t.slug = split_part(h.host, '.', 1)
    LIMIT 1
  )
  SELECT * FROM exact
  UNION ALL
  SELECT * FROM by_sub WHERE NOT EXISTS (SELECT 1 FROM exact)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_by_host(text) TO anon, authenticated;

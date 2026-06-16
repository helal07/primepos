#!/usr/bin/env bash
# Dump every populated public.* table from the Supabase Postgres database
# to NDJSON (one row per line via to_jsonb) so it can be imported into the
# Laravel MySQL backend with `php artisan app:import-supabase`.
#
# Usage:
#   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=postgres \
#     bash scripts/export-supabase.sh ./supabase-export
set -euo pipefail

OUT_DIR="${1:-./supabase-export}"
mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.ndjson

TABLES=$(psql -At -c "SELECT string_agg(table_name, ' ' ORDER BY table_name) \
  FROM information_schema.tables \
  WHERE table_schema='public' AND table_type='BASE TABLE'")

TOTAL=0
for t in $TABLES; do
  n=$(psql -At -c "SELECT count(*) FROM public.\"$t\"")
  if [ "$n" = "0" ]; then continue; fi
  psql -At -c "\\copy (SELECT to_jsonb(r) FROM public.\"$t\" r) TO '${OUT_DIR}/${t}.ndjson'"
  printf "  %-32s %5s rows\n" "$t" "$n"
  TOTAL=$((TOTAL + n))
done

# auth.users → Laravel `users` row shape.
# Requires a role that can read auth.users (Supabase `postgres` / service role).
# Tenant id + superadmin flag are joined in from public.profiles + helper fn.
if psql -At -c "SELECT 1 FROM auth.users LIMIT 1" >/dev/null 2>&1; then
  psql -At -c "\\copy ( \
    SELECT jsonb_build_object( \
      'id', u.id, \
      'tenant_id', p.tenant_id, \
      'name', COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email,'@',1)), \
      'email', u.email, \
      'phone', u.phone, \
      'is_superadmin', COALESCE(public.is_superadmin(u.id), false), \
      'status', 'active', \
      'email_verified_at', u.email_confirmed_at, \
      'password', u.encrypted_password, \
      'remember_token', NULL, \
      'created_at', u.created_at, \
      'updated_at', u.updated_at \
    ) \
    FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id \
    WHERE u.deleted_at IS NULL \
  ) TO '${OUT_DIR}/users.ndjson'"
  uc=$(wc -l < "${OUT_DIR}/users.ndjson")
  printf "  %-32s %5s rows\n" "users (auth.users)" "$uc"
  TOTAL=$((TOTAL + uc))
else
  echo "  (skipped users — current role cannot read auth.users)" >&2
fi
echo "Exported $TOTAL rows → $OUT_DIR"
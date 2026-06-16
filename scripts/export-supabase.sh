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
echo "Exported $TOTAL rows → $OUT_DIR"
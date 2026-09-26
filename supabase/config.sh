#!/usr/bin/env bash
# Supabase project config for paysec telemetry
#
# paysec: telemetry is DISABLED. The upstream project URL and key were
# removed so no usage data ever leaves the machine. Every sender (telemetry-sync,
# update-check ping, community/security dashboards) exits silently when these
# are empty. To collect usage centrally, point these at a Supabase project YOUR
# organisation owns.
# These are PUBLIC keys — safe to commit (like Firebase public config).
# RLS denies all access to the anon key. All reads and writes go through
# edge functions (which use SUPABASE_SERVICE_ROLE_KEY server-side).

PAYSEC_SUPABASE_URL=""
PAYSEC_SUPABASE_ANON_KEY=""

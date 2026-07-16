// sb.js — the Supabase browser client for admin.chiaweiedu.com.
//
// Mirrors backstage's pattern. This is the ANON key: it is designed to be
// public and is safe in a public repo — every table is protected by RLS behind
// it (verified: `profiles` is "permission denied" to anon). The service_role
// key must NEVER appear here; it is server-only and lives in chiawei's .env.
//
// Loaded before auth.js, which reads window.sb.
const SUPABASE_URL = "https://fngddvxroiokqmpxdwwu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZ2Rkdnhyb2lva3FtcHhkd3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjYzMzgsImV4cCI6MjA5Njc0MjMzOH0.x5PQWx-V8gyJvcsNMSFoJYjRWCXgt1fcUAfkhCjlVE0";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

 import { createClient } from '@supabase/supabase-js';
 import type { Database } from './types';
 
 const SUPABASE_URL = "https://xoampivltwofgecadktc.supabase.co";
 const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYW1waXZsdHdvZmdlY2Fka3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg4OTksImV4cCI6MjA4NTc3NDg5OX0.Vo2-tIrsOegAC6aYpmSwa1U6cRQUHbFxszxX2pQuKG4";
 
 export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
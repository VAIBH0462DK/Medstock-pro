// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL  || "https://your-project.supabase.co";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "your-anon-key-here";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,   // ← false fixes lock error
    storage:            window.localStorage,
    storageKey:         "medstock-auth-v1",
    lock:               async (name, acquireTimeout, fn) => {
      // ✅ Custom lock — prevents "Lock broken" AbortError completely
      return await fn();
    },
  },
});
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,
    detectSessionInUrl: false,
    autoRefreshToken:   true,
    storage:            window.localStorage,
    storageKey:         "medstock-auth",
  },
});

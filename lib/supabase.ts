import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser-safe client — uses anon key only. Never put service-role key here.
export const supabase =
  url && key ? createBrowserClient(url, key) : null;

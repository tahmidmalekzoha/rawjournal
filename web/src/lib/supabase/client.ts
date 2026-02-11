import { createBrowserClient } from "@supabase/ssr";
import { createMockClient } from "./mock-client";

export function createClient() {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    return createMockClient() as any;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client during build time
    return null as any;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

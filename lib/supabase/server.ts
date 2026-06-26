import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase環境変数が設定されていません。");
  }

  return createClient(url as string, serviceKey as string, {
    auth: { persistSession: false },
  });
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
      serviceKey &&
      !url.includes("your-project") &&
      !serviceKey.includes("your-service-role-key") &&
      url.startsWith("https://"),
  );
}

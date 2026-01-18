import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

function getEnv() {
  const cfg = window.__ENV || window.env || {};
  const SUPABASE_URL =
    cfg.SUPABASE_URL || cfg.supabaseUrl || window.SUPABASE_URL || "";

  const SUPABASE_ANON_KEY =
    cfg.SUPABASE_ANON_KEY || cfg.supabaseAnonKey || window.SUPABASE_ANON_KEY || "";

  const STORE_SLUG =
    cfg.STORE_SLUG || cfg.storeSlug || window.STORE_SLUG || "tech-boutique";

  const WHATSAPP_NUMBER =
    cfg.WHATSAPP_NUMBER || cfg.whatsappNumber || window.WHATSAPP_NUMBER || "";

  return { SUPABASE_URL, SUPABASE_ANON_KEY, STORE_SLUG, WHATSAPP_NUMBER };
}

export function getConfig() {
  return getEnv();
}

export const STORE_SLUG = getEnv().STORE_SLUG;
export const WHATSAPP_NUMBER = getEnv().WHATSAPP_NUMBER;

export function assertConfig() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const msg =
      "[supabaseClient] Falta SUPABASE_URL o SUPABASE_ANON_KEY. Revisa public/js/env.js (window.__ENV).";
    console.error(msg, { SUPABASE_URL, hasAnonKey: !!SUPABASE_ANON_KEY });
    throw new Error(msg);
  }
}

export const supabase = (() => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[supabaseClient] Config incompleta al inicializar. Asegura env.js antes de tus scripts.");
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "techstore_sb_session",
    },
    global: {
      headers: { "X-Client-Info": "techstore-web" },
    },
  });
})();

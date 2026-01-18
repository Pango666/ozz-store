import { supabase } from "../supabaseClient.js";

export async function createInquiryAndOpenWhatsapp({ storeSlug, name, phone, notes, items }) {
  // items: [{ variant_id, qty }]
  const { data, error } = await supabase.rpc("create_inquiry", {
    p_store_slug: storeSlug,
    p_customer_name: name,
    p_phone: phone,
    p_notes: notes ?? "",
    p_items: items
  });
  if (error) throw error;

  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "whatsapp_admin_number")
    .limit(1);

  const admin = setting?.[0]?.value || "59172078692";
  const msg = encodeURIComponent(data.whatsapp_message);
  window.location.href = `https://wa.me/${admin}?text=${msg}`;
}

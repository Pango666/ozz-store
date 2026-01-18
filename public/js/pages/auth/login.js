// public/js/pages/auth/login.js
import { supabase, assertConfig } from "../../supabaseClient.js";
import { Auth } from "../../lib/auth.js";

assertConfig();

function qs(sel) { return document.querySelector(sel); }

function setError(msg) {
  const box = qs("#login-error");
  if (!box) return;
  if (!msg) {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }
  box.textContent = String(msg);
  box.classList.remove("hidden");
}

function safeNext(raw) {
  const val = String(raw || "").trim();
  if (!val) return "/index.html";
  if (val.startsWith("http://") || val.startsWith("https://")) return "/index.html";
  if (val.startsWith("/") || val.startsWith("./")) return val;
  return "/" + val.replace(/^\/+/, "");
}

function getNext() {
  const url = new URL(window.location.href);
  // Check return_to first (used by authGate), then next
  const returnTo = url.searchParams.get("return_to");
  if (returnTo) return safeNext(decodeURIComponent(returnTo));
  const q = url.searchParams.get("next");
  if (q) return safeNext(decodeURIComponent(q));
  return safeNext(Auth.consumeReturnTo());
}

function showLoginMessage() {
  const url = new URL(window.location.href);
  const message = url.searchParams.get("message");
  if (message) {
    const box = qs("#login-error");
    if (box) {
      const errorMsg = qs("#error-message");
      if (errorMsg) {
        errorMsg.textContent = decodeURIComponent(message);
      } else {
        box.textContent = decodeURIComponent(message);
      }
      box.classList.remove("hidden");
      box.classList.remove("border-red-200", "bg-red-50", "text-red-700");
      box.classList.add("border-blue-200", "bg-blue-50", "text-blue-700");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = qs("#login-form");
  const emailEl = qs("#email");
  const passEl = qs("#password");
  const btn = qs("#btn-login");
  const btnText = qs("#btn-login-text");

  const next = getNext();
  emailEl?.focus();

  // Show message from URL if present
  showLoginMessage();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("");

    const email = String(emailEl?.value || "").trim();
    const password = String(passEl?.value || "");

    if (!email) { setError("Email requerido."); emailEl?.focus(); return; }
    if (!password) { setError("Password requerido."); passEl?.focus(); return; }

    try {
      btn && (btn.disabled = true);
      btnText && (btnText.textContent = "Entrando...");

      // ✅ Llamada directa a Supabase para no “perder” el error
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // ✅ ESTE es el error real (ej: Invalid login credentials / Email not confirmed / etc)
        throw error;
      }

      // A veces session tarda un pelo en estar disponible
      const session = data?.session || (await Auth.getSessionSafe?.()) || (await supabase.auth.getSession()).data?.session || null;

      if (!session) {
        // Si aquí cae, es config de Supabase (confirmación email, cookies, etc)
        throw new Error("Login respondió OK pero no se creó sesión. Revisa Auth settings (confirmación de email / cookies).");
      }

      // ✅ redirige
      window.location.replace(next);

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      const msg =
        err?.message ||
        err?.error_description ||
        err?.toString?.() ||
        "Error iniciando sesión (mira consola F12)";
      setError(msg);

      btn && (btn.disabled = false);
      btnText && (btnText.textContent = "Entrar");
    }
  });
});

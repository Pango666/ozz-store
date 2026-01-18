// public/js/pages/register.js
import { Auth } from "../lib/auth.js";

const form = document.getElementById("reg-form");
const msg = document.getElementById("msg");

function show(text, ok = false) {
  msg.classList.remove("hidden");
  msg.className = "text-sm " + (ok ? "text-green-600" : "text-red-600");
  msg.textContent = text;
}

function valById(id) {
  return (document.getElementById(id)?.value ?? "").toString().trim();
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // ✅ FormData = no depende de IDs perfectos
  const fd = new FormData(form);

  const email =
    (fd.get("email") ?? "").toString().trim() ||
    valById("email") ||
    (document.querySelector('input[type="email"]')?.value ?? "").toString().trim();

  const password =
    (fd.get("password") ?? "").toString() ||
    (document.getElementById("password")?.value ?? "").toString();

  const full_name =
    (fd.get("full_name") ?? "").toString().trim() ||
    valById("full_name");

  try {
    await Auth.signUp({ email, password, full_name });
    show("Cuenta creada. Ahora inicia sesión.", true);
    setTimeout(() => (location.href = "./login.html"), 400);
  } catch (err) {
    show(err?.message || "No se pudo registrar.");
  }
});

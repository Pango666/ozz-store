// public/js/pages/profile.js
import { Auth } from "../lib/auth.js";

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "—";
}

(async () => {
  // Si no hay sesión -> login (y con replace no “vuelves” al profile con Back)
  const ok = await Auth.requireLogin("/auth/profile.html");
  if (!ok) return;

  const user = await Auth.getUser();

  // Si por alguna razón hay sesión rara, fuerzo logout y a login
  if (!user?.id || !user?.email) {
    await Auth.signOut();
    location.replace("/auth/login.html");
    return;
  }

  setText("pf-email", user.email);
  setText("pf-user-id", user.id);

  const btn = $("btn-logout");
  if (btn) {
    btn.addEventListener("click", async () => {
      await Auth.signOut();
      location.replace("/auth/login.html");
    });
  }
})();

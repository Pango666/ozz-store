// public/js/lib/ui.js
// Toast / Popup unificado. Usa SweetAlert2 si existe (window.Swal), si no fallback propio.

function ensureRoot() {
  let root = document.getElementById("techstore-toast-root");
  if (root) return root;

  root = document.createElement("div");
  root.id = "techstore-toast-root";
  root.style.position = "fixed";
  root.style.top = "16px";
  root.style.right = "16px";
  root.style.zIndex = "99999";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "10px";
  root.style.pointerEvents = "none";
  document.body.appendChild(root);
  return root;
}

function clsByType(type) {
  // Tailwind-friendly + fallback si no hay tailwind
  const base = "rounded-xl shadow-lg border px-4 py-3 bg-white text-[#111118]";
  if (type === "success") return `${base} border-green-200`;
  if (type === "error") return `${base} border-red-200`;
  if (type === "warning") return `${base} border-yellow-200`;
  return `${base} border-[#e6e6ee]`;
}

export function toast({ title = "", message = "", type = "info", timeout = 2400 } = {}) {
  // ✅ SweetAlert2 si está disponible
  if (window.Swal && typeof window.Swal.fire === "function") {
    window.Swal.fire({
      toast: true,
      position: "top-end",
      icon: type === "info" ? undefined : type,
      title: title || message,
      text: title ? message : "",
      showConfirmButton: false,
      timer: timeout,
      timerProgressBar: true,
    });
    return;
  }

  const root = ensureRoot();
  const el = document.createElement("div");
  el.className = clsByType(type);
  el.style.pointerEvents = "auto";
  el.style.maxWidth = "360px";

  const t = title ? `<div style="font-weight:800; font-size:13px; margin-bottom:2px;">${escapeHtml(title)}</div>` : "";
  const m = message ? `<div style="font-size:13px; color:#44445f;">${escapeHtml(message)}</div>` : "";

  el.innerHTML = `
    <div style="display:flex; gap:10px; align-items:flex-start;">
      <div style="flex:1; min-width:0;">
        ${t}${m}
      </div>
      <button aria-label="close" style="border:0;background:transparent;cursor:pointer;font-weight:900;color:#616189;">×</button>
    </div>
  `;

  // animación simple
  el.animate(
    [{ transform: "translateY(-6px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    { duration: 160, easing: "ease-out" }
  );

  const btn = el.querySelector("button");
  btn?.addEventListener("click", () => el.remove());

  root.appendChild(el);

  window.setTimeout(() => {
    if (!el.isConnected) return;
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in" }).onfinish = () => el.remove();
  }, timeout);
}

export function popup({ title = "Info", message = "", type = "info" } = {}) {
  if (window.Swal && typeof window.Swal.fire === "function") {
    window.Swal.fire({
      icon: type === "info" ? undefined : type,
      title,
      text: message,
    });
    return;
  }
  alert(`${title}\n\n${message}`);
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

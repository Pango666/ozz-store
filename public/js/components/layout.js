// public/js/components/layout.js
// ✅ Carga header/footer con rutas ABSOLUTAS para que funcione igual en /, /auth, /shop, etc.

function qs(sel) { return document.querySelector(sel); }

function basePath() {
  // Si en algún momento sirves el sitio desde subcarpeta, define en env.js: window.__ENV.BASE_PATH="/sub/"
  const b = (window.__ENV?.BASE_PATH || "/").trim();
  if (!b.startsWith("/")) return "/" + b.replace(/\/+$/, "") + "/";
  return b.replace(/\/+$/, "") + "/";
}

function absolutizeLinks(container) {
  const BASE = basePath(); // "/"
  // href/src tipo "./x" o "x" se rompen en /auth; los pasamos a "/x"
  container.querySelectorAll("a[href], img[src], script[src], link[href]").forEach(el => {
    const attr = el.tagName === "A" || el.tagName === "LINK" ? "href" : "src";
    const v = el.getAttribute(attr);
    if (!v) return;

    // no tocar anclas, mailto, tel, http(s)
    if (v.startsWith("#") || v.startsWith("mailto:") || v.startsWith("tel:") || v.startsWith("http://") || v.startsWith("https://")) return;

    // ya absoluto
    if (v.startsWith("/")) return;

    // normaliza "./x" o "x"
    const clean = v.replace(/^\.\//, "");
    el.setAttribute(attr, BASE + clean);
  });
}

async function injectHtml(targetId, url) {
  const el = qs(targetId);
  if (!el) return;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.warn("No se pudo cargar", url, res.status);
    return;
  }
  const html = await res.text();
  el.innerHTML = html;
  absolutizeLinks(el);
}

function initMobileMenu() {
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const btnMobileSearch = document.getElementById('btn-mobile-search');
  const mobileSearch = document.getElementById('mobile-search');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon = document.getElementById('menu-icon');

  let isMenuOpen = false;
  let isSearchOpen = false;

  if (btnMobileMenu && mobileMenu) {
    btnMobileMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      isMenuOpen = !isMenuOpen;
      mobileMenu.classList.toggle('hidden');
      if (menuIcon) menuIcon.textContent = isMenuOpen ? 'close' : 'menu';
      if (isSearchOpen && mobileSearch) { mobileSearch.classList.add('hidden'); isSearchOpen = false; }
    });
  }

  if (btnMobileSearch && mobileSearch) {
    btnMobileSearch.addEventListener('click', function (e) {
      e.stopPropagation();
      isSearchOpen = !isSearchOpen;
      mobileSearch.classList.toggle('hidden');
      if (isMenuOpen && mobileMenu) { mobileMenu.classList.add('hidden'); if (menuIcon) menuIcon.textContent = 'menu'; isMenuOpen = false; }
      if (isSearchOpen) setTimeout(() => document.getElementById('mobile-search-input')?.focus(), 100);
    });
  }

  document.addEventListener('click', function (e) {
    if (isMenuOpen && mobileMenu && btnMobileMenu && !mobileMenu.contains(e.target) && !btnMobileMenu.contains(e.target)) {
      mobileMenu.classList.add('hidden'); if (menuIcon) menuIcon.textContent = 'menu'; isMenuOpen = false;
    }
    if (isSearchOpen && mobileSearch && btnMobileSearch && !mobileSearch.contains(e.target) && !btnMobileSearch.contains(e.target)) {
      mobileSearch.classList.add('hidden'); isSearchOpen = false;
    }
  });
}

(async function initLayout() {
  const BASE = basePath();

  // ✅ Asumimos que tus parciales están en /partials/header.html y /partials/footer.html
  // (si están en otra ruta, cámbiala aquí y listo)
  await injectHtml("#site-header", `${BASE}partials/header.html`);
  await injectHtml("#site-footer", `${BASE}partials/footer.html`);

  // Initialize mobile menu after header is injected
  initMobileMenu();
})();

(function () {
  const STORAGE_KEY = "rxpulse-public-language";
  const toggles = Array.from(document.querySelectorAll("[data-language-toggle]"));
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  function applyLanguage(lang) {
    const nextLang = lang === "bn" ? "bn" : "en";
    document.documentElement.lang = nextLang;

    document.querySelectorAll("[data-en][data-bn]").forEach(function (el) {
      el.textContent = el.dataset[nextLang] || el.textContent;
    });

    toggles.forEach(function (toggle) {
      toggle.textContent = nextLang === "en" ? "বাংলা" : "EN";
      toggle.setAttribute("aria-label", nextLang === "en" ? "Switch to Bangla" : "Switch to English");
    });

    try { localStorage.setItem(STORAGE_KEY, nextLang); } catch (_) {}
  }

  function initLanguage() {
    let lang = "en";
    try { lang = localStorage.getItem(STORAGE_KEY) || "en"; } catch (_) {}
    applyLanguage(lang);
  }

  function closeMenu() {
    if (!nav || !navToggle) return;
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function initNavigation() {
    if (!nav) return;

    function normalizePath(path) {
      const clean = (path || "").replace(/\/$/, "") || "/index";
      return clean.replace(/\.html$/, "");
    }

    const currentPath = normalizePath(window.location.pathname);
    nav.querySelectorAll("a[href]").forEach(function (link) {
      const href = link.getAttribute("href") || "";
      const hrefPath = normalizePath(href);
      if (hrefPath && currentPath === hrefPath) {
        link.setAttribute("aria-current", "page");
      }
      link.addEventListener("click", closeMenu);
    });

    if (navToggle) {
      navToggle.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("nav-open", isOpen);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) closeMenu();
    });
  }

  toggles.forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      const current = document.documentElement.lang === "bn" ? "bn" : "en";
      applyLanguage(current === "en" ? "bn" : "en");
    });
  });

  initNavigation();
  initLanguage();
})();

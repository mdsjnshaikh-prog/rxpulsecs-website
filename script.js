/* Force latest design-system CSS (hero-fix) */
(function () {
  try {
    var ver = "20260805-hero-fix";
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.indexOf("ui-components.css") !== -1 && href.indexOf(ver) === -1) {
        link.setAttribute("href", "/ui-components.css?v=" + ver);
      }
    });
  } catch (e) {}
})();

(function () {
  if (!("querySelectorAll" in document)) return;
  document.querySelectorAll("img:not([loading])").forEach(function (img) {
    img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
  });
})();

(function () {
  const STORAGE_KEY = "rxpulse-public-language";
  const toggles = Array.from(document.querySelectorAll("[data-language-toggle]"));
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  function currentLang() {
    return document.documentElement.lang === "bn" ? "bn" : "en";
  }

  function uiText(en, bn) {
    return currentLang() === "bn" ? (bn || en) : en;
  }

  function ensureToastStack() {
    let stack = document.querySelector(".rxpulse-toast-stack");
    if (stack) return stack;
    stack = document.createElement("div");
    stack.className = "rxpulse-toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
    return stack;
  }

  function showToast(message, type, duration) {
    if (!message) return;
    const stack = ensureToastStack();
    const toast = document.createElement("div");
    toast.className = "rxpulse-toast " + (type || "info");
    toast.textContent = message;
    stack.appendChild(toast);
    window.requestAnimationFrame(function () { toast.classList.add("show"); });
    window.setTimeout(function () {
      toast.classList.remove("show");
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }, duration || 3200);
  }
  window.rxpulseShowToast = showToast;

  function applyLanguage(lang) {
    const nextLang = lang === "bn" ? "bn" : "en";
    document.documentElement.lang = nextLang;
    document.querySelectorAll("[data-en][data-bn]").forEach(function (el) {
      el.textContent = el.dataset[nextLang] || el.textContent;
    });
    const titleEl = document.querySelector("title[data-title-en][data-title-bn]");
    if (titleEl) {
      const t = titleEl.getAttribute("data-title-" + nextLang);
      if (t) { document.title = t; titleEl.textContent = t; }
    }
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
      if (normalizePath(href) && currentPath === normalizePath(href)) link.setAttribute("aria-current", "page");
      link.addEventListener("click", closeMenu);
    });
    if (navToggle) {
      navToggle.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("nav-open", isOpen);
      });
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1024) closeMenu(); });
  }

  toggles.forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      const next = currentLang() === "en" ? "bn" : "en";
      applyLanguage(next);
      showToast(next === "bn" ? "ভাষা বাংলা করা হয়েছে" : "Language switched to English", "success", 2200);
    });
  });

  function initActionFeedback() {
    document.addEventListener("click", function (event) {
      const target = event.target.closest("a[href], button");
      if (!target || target.matches("[data-language-toggle], .nav-toggle")) return;
      const href = target.getAttribute("href") || "";
      if (href.startsWith("mailto:")) showToast(uiText("Opening your email app...", "আপনার ইমেইল অ্যাপ খোলা হচ্ছে..."), "info", 4200);
    }, true);
  }

  function initReveal() {
    const items = Array.from(document.querySelectorAll(
      ".card, .feature-card, .download-card, .price-card, .timeline-item, .step-list > div, .auth-panel, .success-card, .support-card"
    ));
    if (!items.length) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    items.forEach(function (item) { item.classList.add("reveal-ready"); });
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("in-view"); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    items.forEach(function (item) { observer.observe(item); });
    window.setTimeout(function () {
      document.querySelectorAll(".reveal-ready:not(.in-view)").forEach(function (el) {
        el.classList.add("in-view");
      });
    }, 1200);
  }

  function initSectionProgress() {
    const bar = document.createElement("div");
    bar.className = "rxpulse-scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    function update() {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      bar.style.transform = "scaleX(" + (Math.min(100, Math.max(0, (window.scrollY / max) * 100)) / 100) + ")";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  initNavigation();
  initSectionProgress();
  initLanguage();
  initActionFeedback();
  initReveal();
})();

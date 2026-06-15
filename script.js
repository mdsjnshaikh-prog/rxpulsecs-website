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
    stack.setAttribute("aria-atomic", "false");
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

    window.requestAnimationFrame(function () {
      toast.classList.add("show");
    });

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
        showToast(
          isOpen ? uiText("Menu opened", "মেনু খোলা হয়েছে") : uiText("Menu closed", "মেনু বন্ধ হয়েছে"),
          "info",
          1500
        );
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
      const current = currentLang();
      const next = current === "en" ? "bn" : "en";
      applyLanguage(next);
      toggle.classList.add("lang-toggle-flash");
      showToast(
        next === "bn" ? "ভাষা বাংলা করা হয়েছে" : "Language switched to English",
        "success",
        2200
      );
      setTimeout(function () { toggle.classList.remove("lang-toggle-flash"); }, 450);
    });
  });

  function isPlainClick(event) {
    return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented);
  }

  function isInternalNavigable(href) {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      return url.pathname !== window.location.pathname || url.search !== window.location.search || url.hash !== window.location.hash;
    } catch (_) {
      return false;
    }
  }

  function initActionFeedback() {
    document.addEventListener("click", function (event) {
      const target = event.target.closest("a[href], button");
      if (!target || !document.body.contains(target)) return;
      if (target.matches("[data-language-toggle], .nav-toggle")) return;

      target.classList.add("tap-feedback");
      window.setTimeout(function () { target.classList.remove("tap-feedback"); }, 260);

      if (target.tagName === "BUTTON") return;

      const href = target.getAttribute("href") || "";
      if (href.startsWith("mailto:")) {
        showToast(
          uiText("Opening your email app...", "আপনার ইমেইল অ্যাপ খোলা হচ্ছে..."),
          "info",
          4200
        );
        return;
      }

      if (href.startsWith("tel:")) {
        showToast(
          uiText("Opening phone dialer...", "ফোন ডায়ালার খোলা হচ্ছে..."),
          "info",
          2800
        );
        return;
      }

      if (!isPlainClick(event)) return;

      if (target.target === "_blank") {
        showToast(uiText("Opening in a new tab...", "নতুন ট্যাবে খোলা হচ্ছে..."), "info", 2200);
        return;
      }

      if (isInternalNavigable(href)) {
        target.classList.add("is-loading");
        target.setAttribute("aria-busy", "true");
        showToast(uiText("Opening page...", "পেজ খোলা হচ্ছে..."), "info", 2200);
      }
    }, true);

    window.addEventListener("pageshow", function () {
      document.querySelectorAll(".is-loading[aria-busy='true']").forEach(function (el) {
        el.classList.remove("is-loading");
        el.removeAttribute("aria-busy");
      });
    });
  }

  function initReveal() {
    const items = Array.from(document.querySelectorAll(
      ".hero-copy, .hero-card, .card, .feature-card, .download-card, .price-card, .timeline-item, .step-list > div, .auth-panel, .success-card"
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
  }

  initNavigation();
  initLanguage();
  initActionFeedback();
  initReveal();
})();

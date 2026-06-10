(function () {
  const STORAGE_KEY = "rxpulse-public-language";
  const toggle = document.querySelector("[data-language-toggle]");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  function applyLanguage(lang) {
    document.documentElement.lang = lang === "en" ? "en" : "bn";
    document.querySelectorAll("[data-en][data-bn]").forEach(function (el) {
      el.textContent = el.dataset[lang] || el.textContent;
    });
    if (toggle) toggle.textContent = lang === "en" ? "BN" : "EN";
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
  }

  function initLanguage() {
    let lang = "bn";
    try { lang = localStorage.getItem(STORAGE_KEY) || "bn"; } catch (_) {}
    applyLanguage(lang);
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      const current = document.documentElement.lang === "en" ? "en" : "bn";
      applyLanguage(current === "en" ? "bn" : "en");
    });
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  initLanguage();
})();

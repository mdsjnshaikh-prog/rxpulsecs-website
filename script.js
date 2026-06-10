(function () {
  const root = document.documentElement;
  const langToggle = document.querySelector('[data-language-toggle]');
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const translatable = document.querySelectorAll('[data-en][data-bn]');

  function applyLanguage(lang) {
    const selected = lang === 'en' ? 'en' : 'bn';
    root.lang = selected;
    translatable.forEach((el) => {
      const value = el.dataset[selected];
      if (value) el.textContent = value;
    });
    if (langToggle) {
      langToggle.textContent = selected === 'bn' ? 'EN' : 'বাংলা';
      langToggle.setAttribute('aria-label', selected === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন');
    }
    localStorage.setItem('rxpulse-language', selected);
  }

  const savedLanguage = localStorage.getItem('rxpulse-language') || 'bn';
  applyLanguage(savedLanguage);

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      applyLanguage(root.lang === 'bn' ? 'en' : 'bn');
    });
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();

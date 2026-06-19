(function () {
  const THEME_BY_CATEGORY = {
    "Medicine": {
      key: "medicine",
      labelEn: "Medicine",
      labelBn: "মেডিসিন",
      icon: "⚕",
    },
    "Surgery": {
      key: "surgery",
      labelEn: "Surgery",
      labelBn: "সার্জারি",
      icon: "✚",
    },
    "Obstetrics & Gynaecology": {
      key: "obgyn",
      labelEn: "Obstetrics & Gynaecology",
      labelBn: "গাইনি ও প্রসূতি",
      icon: "♡",
    },
    "Paediatrics": {
      key: "paediatrics",
      labelEn: "Paediatrics",
      labelBn: "শিশুরোগ",
      icon: "🧸",
    },
    "Dental": {
      key: "dental",
      labelEn: "Dental",
      labelBn: "ডেন্টাল",
      icon: "🦷",
    },
    "Clinical Specialty": {
      key: "clinical",
      labelEn: "Clinical Specialty",
      labelBn: "ক্লিনিক্যাল স্পেশালিটি",
      icon: "✦",
    },
    "Laboratory & Diagnostic": {
      key: "diagnostic-public",
      labelEn: "Diagnostic & Public Health",
      labelBn: "ডায়াগনস্টিক ও পাবলিক হেলথ",
      icon: "🔬",
    },
    "Public Health & Academic": {
      key: "diagnostic-public",
      labelEn: "Diagnostic & Public Health",
      labelBn: "ডায়াগনস্টিক ও পাবলিক হেলথ",
      icon: "🔬",
    },
  };

  const FALLBACK_RULES = [
    { key: "dental", pattern: /\b(dent|oral|maxillofacial|orthodont|prosthodont|periodont|endodont|tooth|teeth|bds)\b/i },
    { key: "paediatrics", pattern: /\b(paediatric|pediatric|child|children|neonat|newborn|nicu|picu)\b/i },
    { key: "obgyn", pattern: /\b(gyn|gynaec|gynec|obstetric|maternal|fetal|feto|infertility|reproductive|ivf|pregnancy)\b/i },
    { key: "surgery", pattern: /\b(surgeon|surgery|surgical|orthopedic|orthopaedic|neurosurgery|urology|vascular|colorectal|hepatobiliary|transplant|plastic|burn|spine|cardiothoracic|cardiac surgeon)\b/i },
    { key: "diagnostic-public", pattern: /\b(patholog|microbiolog|biochem|radiolog|imaging|nuclear|forensic|community|public health|transfusion|diagnostic|laboratory)\b/i },
    { key: "clinical", pattern: /\b(psychiat|anesth|anaesth|emergency|critical|icu|palliative|sleep|sports|rehabilitation|physical medicine)\b/i },
    { key: "medicine", pattern: /\b(medicine|physician|cardio|neuro|endocrin|diabetes|gastro|hepato|nephro|pulmo|chest|respiratory|hemato|onco|derm|skin|ent|ophthalm|eye|rheumat|infectious|geriatric|allergy|immunology)\b/i },
  ];

  function getLang() {
    return document.documentElement.lang === "bn" ? "bn" : "en";
  }

  function text(en, bn) {
    return getLang() === "bn" ? (bn || en) : en;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") {
      return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  function normalizeSlug(value) {
    if (!value || typeof value !== "string") return "";
    return value
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, "")
      .replace(/^doctors\//i, "")
      .replace(/^u\//i, "")
      .replace(/\/+$/, "");
  }

  function currentSlugFromPath() {
    const path = window.location.pathname.replace(/\/+$/, "");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(window.location.search || "");
    const querySlug = normalizeSlug(params.get("slug") || params.get("profile") || params.get("doctor") || "");

    if (parts[0] === "doctors" && parts.length >= 3) {
      return normalizeSlug(`${parts[1]}/${parts.slice(2).join("/")}`);
    }
    if (parts[0] === "doctors" && parts.length === 2) return normalizeSlug(parts[1]);
    if (parts[0] === "doctors.html" && querySlug) return querySlug;
    if (parts[0] === "u" && parts[1]) return normalizeSlug(parts[1]);
    if (querySlug) return querySlug;
    return "";
  }

  async function restFetch(table, params, timeoutMs) {
    if (!window.RXPULSE_SUPABASE_URL || !window.RXPULSE_SUPABASE_ANON_KEY) {
      throw new Error("Supabase public configuration is missing.");
    }

    const url = new URL(`${window.RXPULSE_SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs || 10000) : null;

    try {
      const response = await fetch(url.toString(), {
        headers: {
          apikey: window.RXPULSE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.RXPULSE_SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        signal: controller ? controller.signal : undefined,
      });

      if (!response.ok) throw new Error(`Failed to load ${table}: ${response.status}`);
      return response.json();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function doctorCodeFromSlug(slug) {
    const firstPart = normalizeSlug(slug).split("/").filter(Boolean)[0] || "";
    return /^id[A-Za-z0-9]+$/.test(firstPart) ? firstPart : "";
  }

  async function findProfile(slug) {
    const normalizedSlug = normalizeSlug(slug);
    const select = [
      "id", "doctorId", "slug", "name", "specialties", "bmdcNumber",
      "isApproved", "approvalStatus"
    ].join(",");

    const exact = await restFetch("publicProfiles", { select, slug: `eq.${normalizedSlug}`, limit: "1" });
    if (exact && exact[0]) return exact[0];

    const doctorCode = doctorCodeFromSlug(normalizedSlug);
    if (doctorCode) {
      const byDoctorCode = await restFetch("publicProfiles", { select, slug: `like.${doctorCode}/*`, limit: "1" });
      if (byDoctorCode && byDoctorCode[0]) return byDoctorCode[0];
    }

    if (normalizedSlug && !normalizedSlug.startsWith("id")) {
      const profiles = await restFetch("publicProfiles", { select, limit: "100" });
      return profiles.find((profile) => profile.slug === normalizedSlug || String(profile.slug || "").endsWith(`/${normalizedSlug}`)) || null;
    }
    return null;
  }

  async function loadSpecialtyCatalogue() {
    try {
      const rows = await restFetch("doctor_specialties", {
        select: "label_en,label_bn,category,aliases_en,aliases_bn,is_active",
        is_active: "eq.true",
        order: "display_order.asc",
      }, 7000);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      console.warn("[RxPulse Public Profile Theme] Specialty catalogue unavailable; using local theme fallback.", error);
      return [];
    }
  }

  function normalizeComparable(value) {
    return String(value || "").trim().toLowerCase();
  }

  function resolveThemeFromCatalogue(specialties, catalogue) {
    const selected = normalizeArray(specialties);
    if (!selected.length || !catalogue.length) return null;

    for (const specialty of selected) {
      const needle = normalizeComparable(specialty);
      const match = catalogue.find((item) => {
        const labels = [item.label_en, item.label_bn, ...(item.aliases_en || []), ...(item.aliases_bn || [])]
          .map(normalizeComparable)
          .filter(Boolean);
        return labels.some((label) => label === needle || label.includes(needle) || needle.includes(label));
      });
      if (match && THEME_BY_CATEGORY[match.category]) return THEME_BY_CATEGORY[match.category];
    }
    return null;
  }

  function resolveThemeByFallback(specialties) {
    const body = normalizeArray(specialties).join(" ");
    const match = FALLBACK_RULES.find((rule) => rule.pattern.test(body));
    if (!match) return THEME_BY_CATEGORY.Medicine;
    const categoryMatch = Object.values(THEME_BY_CATEGORY).find((theme) => theme.key === match.key);
    return categoryMatch || THEME_BY_CATEGORY.Medicine;
  }

  function clearExistingThemes() {
    document.body.className = document.body.className
      .split(/\s+/)
      .filter((cls) => cls && !cls.startsWith("doctor-theme-"))
      .join(" ");
  }

  function applyTheme(theme) {
    const article = document.querySelector(".public-doctor-profile");
    if (!article || !theme) return;

    clearExistingThemes();
    document.body.classList.add(`doctor-theme-${theme.key}`);
    article.dataset.specialtyTheme = theme.key;
    article.style.setProperty("--doctor-theme-icon", `"${theme.icon}"`);

    const hero = article.querySelector(".profile-hero");
    if (!hero || hero.querySelector(".specialty-theme-pill")) return;

    const pill = document.createElement("p");
    pill.className = "specialty-theme-pill";
    pill.innerHTML = `<span aria-hidden="true">${escapeHtml(theme.icon)}</span>${escapeHtml(text(theme.labelEn, theme.labelBn))}`;
    hero.insertBefore(pill, hero.firstElementChild ? hero.firstElementChild.nextSibling : null);
  }

  function insertBmdcNumber(profile) {
    const bmdcNumber = String(profile && profile.bmdcNumber ? profile.bmdcNumber : "").trim();
    if (!bmdcNumber || document.querySelector(".bmdc-pill")) return;

    const identityText = document.querySelector(".doctor-identity > div:last-child");
    if (!identityText) return;

    const bmdc = document.createElement("p");
    bmdc.className = "bmdc-pill";
    bmdc.innerHTML = `<span>${escapeHtml(text("BMDC Reg. No", "বিএমডিসি রেজি. নং"))}</span><strong>${escapeHtml(bmdcNumber)}</strong>`;

    const specialty = identityText.querySelector(".specialty-pill");
    const workplace = identityText.querySelector(".workplace");
    if (specialty && specialty.nextSibling) {
      identityText.insertBefore(bmdc, specialty.nextSibling);
    } else if (workplace) {
      identityText.insertBefore(bmdc, workplace);
    } else {
      identityText.appendChild(bmdc);
    }
  }

  function waitForRenderedProfile(timeoutMs) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(".public-doctor-profile");
      if (existing) return resolve(existing);

      const observer = new MutationObserver(() => {
        const found = document.querySelector(".public-doctor-profile");
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timed out waiting for public profile render."));
      }, timeoutMs || 16000);
    });
  }

  async function initThemeEnhancements() {
    try {
      const slug = currentSlugFromPath();
      if (!slug) return;

      await waitForRenderedProfile();
      const profile = await findProfile(slug);
      if (!profile || profile.isApproved !== true || profile.approvalStatus !== "approved") return;

      insertBmdcNumber(profile);

      const catalogue = await loadSpecialtyCatalogue();
      const theme = resolveThemeFromCatalogue(profile.specialties, catalogue) || resolveThemeByFallback(profile.specialties);
      applyTheme(theme);
    } catch (error) {
      console.warn("[RxPulse Public Profile Theme] Enhancements skipped.", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeEnhancements, { once: true });
  } else {
    initThemeEnhancements();
  }
})();

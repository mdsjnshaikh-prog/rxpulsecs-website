(function () {
  const root = document.getElementById("doctor-profile-root");
  const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const STATUS_LABELS = {
    Available: { en: "Open", bn: "চেম্বার খোলা" },
    Limited: { en: "Limited hours", bn: "সীমিত সময়" },
    Closed: { en: "Closed", bn: "বন্ধ" },
    Cancelled: { en: "Cancelled", bn: "বাতিল" },
  };

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

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") {
      return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  function safeHttpUrl(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    const lowered = trimmed.toLowerCase();
    return lowered.startsWith("http://") || lowered.startsWith("https://") ? trimmed : "";
  }

  function safeImageUrl(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    const lowered = trimmed.toLowerCase();
    if (lowered.startsWith("http://") || lowered.startsWith("https://")) return trimmed;
    // Doctor photos may be stored as browser-ready data URLs by the app.
    // Allow only base64 image MIME types; reject arbitrary data: content.
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(trimmed)) return trimmed;
    return "";
  }

  function safeTel(phone) {
    return String(phone || "").replace(/[^+0-9]/g, "");
  }

  function formatTime(value) {
    if (!value) return "";
    const raw = String(value).slice(0, 5);
    const parts = raw.split(":");
    if (parts.length < 2) return raw;
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw;
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
  }

  function localDateString(date) {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60 * 1000);
    return adjusted.toISOString().split("T")[0];
  }

  function isOverrideActive(override) {
    if (!override || override.is_enabled === false) return false;
    if (override.effective_period === "manual") return true;

    const today = localDateString(new Date());
    if (override.effective_period === "today") return override.effective_date === today;
    if (override.effective_period === "tomorrow") {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      return override.effective_date === localDateString(tomorrowDate);
    }
    if (override.effective_period === "date" || override.effective_period === "date_range") {
      if (override.effective_date && override.effective_end_date) {
        return today >= override.effective_date && today <= override.effective_end_date;
      }
      if (override.effective_date) return today === override.effective_date;
    }
    return false;
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
    if (parts[0] === "doctors" && parts.length === 2) {
      return normalizeSlug(parts[1]);
    }
    if (parts[0] === "doctors.html" && querySlug) return querySlug;
    if (parts[0] === "u" && parts[1]) return normalizeSlug(parts[1]);
    if (querySlug) return querySlug;
    return "";
  }

  async function restFetch(table, params) {
    if (!window.RXPULSE_SUPABASE_URL || !window.RXPULSE_SUPABASE_ANON_KEY) {
      throw new Error("Supabase public configuration is missing.");
    }
    const url = new URL(`${window.RXPULSE_SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));

    // Abort slow requests so doctors on weak/unstable internet get a clear
    // "try again" state instead of an indefinitely hanging page.
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

    let response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          apikey: window.RXPULSE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.RXPULSE_SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        signal: controller ? controller.signal : undefined,
      });
    } catch (networkError) {
      if (networkError && networkError.name === "AbortError") {
        const timeoutErr = new Error(`Request for ${table} timed out.`);
        timeoutErr.isNetwork = true;
        throw timeoutErr;
      }
      // Most fetch rejections here are connectivity problems (offline, DNS, TLS).
      if (networkError) networkError.isNetwork = true;
      throw networkError;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Failed to load ${table}: ${response.status} ${body}`);
    }
    return response.json();
  }

  function doctorCodeFromSlug(slug) {
    const normalized = normalizeSlug(slug);
    const firstPart = normalized.split("/").filter(Boolean)[0] || "";
    return /^id[A-Za-z0-9]+$/.test(firstPart) ? firstPart : "";
  }

  async function findProfile(slug) {
    const normalizedSlug = normalizeSlug(slug);
    const select = [
      "id", "doctorId", "slug", "name", "qualifications", "specialties", "designation", "workplace",
      "bio", "expertise", "chamberInfo", "timings", "whatsappNumber", "profilePhotoUrl", "template",
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

  async function loadChamberData(doctorId) {
    const chamberSelect = "id,doctor_id,chamber_name,address,primary_phone,alternative_phone,maps_link,instruction_note,display_order,is_active";
    const scheduleSelect = "id,doctor_id,chamber_id,day_of_week,start_time,end_time,status";
    const overrideSelect = "id,doctor_id,chamber_id,status,effective_period,is_enabled,effective_date,effective_end_date,temporary_message,start_time_override,end_time_override";

    const [chambers, schedule, overrides] = await Promise.all([
      restFetch("doctor_chambers", { select: chamberSelect, doctor_id: `eq.${doctorId}`, order: "display_order.asc" }),
      restFetch("doctor_chamber_schedule", { select: scheduleSelect, doctor_id: `eq.${doctorId}` }),
      restFetch("doctor_chamber_availability_overrides", { select: overrideSelect, doctor_id: `eq.${doctorId}` }),
    ]);

    return {
      chambers: Array.isArray(chambers) ? chambers : [],
      schedule: Array.isArray(schedule) ? schedule : [],
      overrides: Array.isArray(overrides) ? overrides : [],
    };
  }

  function renderLoading(message) {
    root.innerHTML = `
      <div class="doctor-profile-state loading-state">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>${escapeHtml(message || text("Loading doctor profile...", "ডাক্তারের প্রোফাইল লোড হচ্ছে..."))}</p>
      </div>
    `;
  }

  function renderState(kind, title, message, options) {
    const opts = options || {};
    const icon = kind === "error" ? "!" : kind === "hidden" ? "—" : "…";
    const retryButton = opts.showRetry
      ? `<button type="button" class="button primary" id="profile-retry">${escapeHtml(text("Try again", "আবার চেষ্টা করুন"))}</button>`
      : `<a class="button primary" href="/index.html">${escapeHtml(text("Go home", "হোমে যান"))}</a>`;

    root.innerHTML = `
      <div class="doctor-profile-state ${escapeAttr(kind)}-state">
        <div class="state-icon" aria-hidden="true">${escapeHtml(icon)}</div>
        <p class="eyebrow">${escapeHtml(kind === "hidden" ? text("Not available", "পাওয়া যাচ্ছে না") : "RxPulse")}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <div class="actions center-actions">
          ${retryButton}
          <a class="button secondary" href="/support.html">${escapeHtml(text("Contact support", "সাপোর্টে যোগাযোগ করুন"))}</a>
        </div>
      </div>
    `;

    if (opts.showRetry) {
      const retry = document.getElementById("profile-retry");
      if (retry) {
        retry.addEventListener("click", function () {
          retry.disabled = true;
          retry.textContent = text("Retrying...", "আবার চেষ্টা হচ্ছে...");
          init();
        });
      }
    }
  }

  function renderExpertise(profile) {
    const expertise = normalizeArray(profile.expertise);
    if (!expertise.length) return "";
    return `
      <section class="public-card expertise-card">
        <p class="section-kicker">${escapeHtml(text("Expertise", "দক্ষতার ক্ষেত্র"))}</p>
        <h2>${escapeHtml(text("Clinical focus", "চিকিৎসা সেবার ক্ষেত্র"))}</h2>
        <div class="expertise-list">
          ${expertise.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>
    `;
  }

  function schedulesForChamber(chamber, schedule) {
    const sorted = [...schedule].sort((a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week));
    const chamberSpecific = sorted.filter((item) => item.chamber_id === chamber.id);
    if (chamberSpecific.length) return chamberSpecific;
    return sorted.filter((item) => !item.chamber_id);
  }

  function overridesForChamber(chamber, overrides) {
    const chamberSpecific = overrides.filter((item) => item.chamber_id === chamber.id);
    const relevant = chamberSpecific.length ? chamberSpecific : overrides.filter((item) => !item.chamber_id);
    return relevant.filter(isOverrideActive);
  }

  function renderChamberWidget(chambers, schedule, overrides) {
    const activeChambers = (chambers || [])
      .filter((chamber) => chamber && chamber.is_active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    if (!activeChambers.length) {
      return `
        <aside class="public-card chamber-widget empty-chamber">
          <p class="section-kicker">${escapeHtml(text("Chamber", "চেম্বার"))}</p>
          <h2>${escapeHtml(text("Chamber information not configured yet", "চেম্বার তথ্য এখনো যুক্ত করা হয়নি"))}</h2>
        </aside>
      `;
    }

    return `
      <aside class="chamber-stack">
        ${activeChambers.map((chamber, index) => {
          const chamberSchedule = schedulesForChamber(chamber, schedule || []);
          const activeOverrides = overridesForChamber(chamber, overrides || []);
          const mapsLink = safeHttpUrl(chamber.maps_link);
          const primaryPhone = chamber.primary_phone || "";
          const alternativePhone = chamber.alternative_phone || "";

          return `
            <section class="public-card chamber-widget">
              <p class="section-kicker">${escapeHtml(text("Chamber", "চেম্বার"))}${activeChambers.length > 1 ? ` ${index + 1}` : ""}</p>
              <h2>${escapeHtml(chamber.chamber_name || text("Personal Chamber", "ব্যক্তিগত চেম্বার"))}</h2>
              ${chamber.address ? `<p class="chamber-address">${escapeHtml(chamber.address)}</p>` : ""}
              ${mapsLink ? `<a class="mini-link" href="${escapeAttr(mapsLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text("View map", "ম্যাপ দেখুন"))}</a>` : ""}
              ${(primaryPhone || alternativePhone) ? `
                <div class="contact-actions">
                  ${primaryPhone ? `<a class="button primary" href="tel:${escapeAttr(safeTel(primaryPhone))}">${escapeHtml(text("Call for serial", "সিরিয়ালের জন্য কল করুন"))}: ${escapeHtml(primaryPhone)}</a>` : ""}
                  ${alternativePhone ? `<a class="button secondary" href="tel:${escapeAttr(safeTel(alternativePhone))}">${escapeHtml(alternativePhone)}</a>` : ""}
                </div>
              ` : ""}
              ${chamber.instruction_note ? `<p class="instruction-note">${escapeHtml(chamber.instruction_note)}</p>` : ""}
              ${activeOverrides.length ? `
                <div class="availability-alert">
                  <strong>${escapeHtml(text("Current chamber status", "বর্তমান চেম্বার অবস্থা"))}</strong>
                  ${activeOverrides.map((override) => `
                    <p>${escapeHtml(statusLabel(override.status))}${override.temporary_message ? ` — ${escapeHtml(override.temporary_message)}` : ""}</p>
                    ${(override.start_time_override || override.end_time_override) ? `<small>${escapeHtml(formatTime(override.start_time_override))} - ${escapeHtml(formatTime(override.end_time_override))}</small>` : ""}
                  `).join("")}
                </div>
              ` : ""}
              ${chamberSchedule.length ? renderScheduleSection(chamberSchedule) : ""}
            </section>
          `;
        }).join("")}
      </aside>
    `;
  }

  function renderScheduleSection(chamberSchedule) {
    const openCount = chamberSchedule.filter((item) => item.status !== "Closed" && item.status !== "Cancelled").length;
    const openLabel = openCount === 1
      ? text("1 day open", "১ দিন খোলা")
      : text(`${openCount} days open`, `${openCount} দিন খোলা`);

    return `
      <div class="schedule-card">
        <div class="schedule-header">
          <div>
            <p class="section-kicker">${escapeHtml(text("Visit time", "চেম্বারের সময়"))}</p>
            <h3>${escapeHtml(text("Weekly chamber schedule", "সাপ্তাহিক চেম্বার সময়সূচি"))}</h3>
          </div>
          <span class="schedule-summary-pill">${escapeHtml(openLabel)}</span>
        </div>
        <div class="schedule-grid">
          ${chamberSchedule.map((item) => renderScheduleRow(item)).join("")}
        </div>
      </div>
    `;
  }

  function statusLabel(status) {
    const item = STATUS_LABELS[status] || { en: status || "Status", bn: status || "অবস্থা" };
    return text(item.en, item.bn);
  }

  function renderScheduleRow(item) {
    const status = item.status || "Closed";
    const isClosed = status === "Closed" || status === "Cancelled";
    const isLimited = status === "Limited";
    const timeText = isClosed
      ? statusLabel(status)
      : `${formatTime(item.start_time) || "-"} – ${formatTime(item.end_time) || "-"}`;
    const dayName = item.day_of_week || "";

    return `
      <div class="schedule-day-card ${isClosed ? "is-closed" : "is-open"} ${isLimited ? "is-limited" : ""}">
        <div class="schedule-day-top">
          <span class="schedule-day-name">${escapeHtml(dayName)}</span>
          <span class="schedule-status-badge">${escapeHtml(isClosed ? statusLabel(status) : statusLabel(isLimited ? "Limited" : "Available"))}</span>
        </div>
        <strong class="schedule-time-text">${escapeHtml(timeText)}</strong>
      </div>
    `;
  }

  function looksLikeInternalPrompt(value) {
    const body = String(value || "").toLowerCase();
    return body.includes("do not apply any changes")
      || body.includes("markdown report")
      || body.includes("doctorportfolio.tsx")
      || body.includes("appLayout.tsx".toLowerCase())
      || body.includes("phase_5")
      || body.includes("claude_final");
  }

  function renderBio(profile) {
    if (!profile.bio || looksLikeInternalPrompt(profile.bio)) return "";
    return `
      <section class="public-card bio-card">
        <p class="section-kicker">${escapeHtml(text("About", "পরিচিতি"))}</p>
        <h2>${escapeHtml(text("About the doctor", "ডাক্তারের সম্পর্কে"))}</h2>
        <p class="preline">${escapeHtml(profile.bio)}</p>
      </section>
    `;
  }

  function renderIdentity(profile) {
    const initial = (profile.name || "D").trim().charAt(0).toUpperCase() || "D";
    const photo = safeImageUrl(profile.profilePhotoUrl);
    const fallback = `<div class="doctor-photo fallback-photo">${escapeHtml(initial)}</div>`;
    return `
      <div class="doctor-identity">
        <div class="doctor-photo-wrap">
          ${photo ? `<img class="doctor-photo" src="${escapeAttr(photo)}" alt="${escapeAttr(profile.name || "Doctor")}" loading="lazy" decoding="async" data-initial="${escapeAttr(initial)}"/>` : fallback}
        </div>
        <div>
          <p class="verified-pill">${escapeHtml(text("Verified RxPulse public profile", "ভেরিফায়েড RxPulse পাবলিক প্রোফাইল"))}</p>
          <h1>${escapeHtml(profile.name || text("Doctor", "ডাক্তার"))}</h1>
          ${profile.qualifications ? `<p class="qualification">${escapeHtml(profile.qualifications)}</p>` : ""}
          ${profile.specialties ? `<p class="specialty-pill">${escapeHtml(profile.specialties)}</p>` : ""}
          ${(profile.designation || profile.workplace) ? `<p class="workplace">${escapeHtml([profile.designation, profile.workplace].filter(Boolean).join(" • "))}</p>` : ""}
        </div>
      </div>
    `;
  }

  function renderTemplate(profile, chamberHtml) {
    const template = ["template1", "template2", "template3", "template4", "template5"].includes(profile.template) ? profile.template : "template1";
    const templateName = {
      template1: "Minimal Professional",
      template2: "Modern Glass",
      template3: "Premium Hospital",
      template4: "Personal Branding",
      template5: "Mobile Friendly",
    }[template];

    return `
      <article class="public-doctor-profile ${template}">
        <div class="template-accent" aria-hidden="true"></div>
        <div class="profile-hero public-card">
          <p class="section-kicker">${escapeHtml(templateName)}</p>
          ${renderIdentity(profile)}
          <div class="profile-share">
            <button type="button" class="button secondary profile-copy-btn" id="profile-copy-link">
              ${escapeHtml(text("Copy profile link", "প্রোফাইল লিংক কপি করুন"))}
            </button>
            <span class="profile-copy-feedback" id="profile-copy-feedback" role="status" aria-live="polite"></span>
          </div>
        </div>
        <div class="public-profile-grid">
          <div class="profile-main-column">
            ${renderBio(profile)}
            ${renderExpertise(profile)}
          </div>
          <div class="profile-side-column">
            ${chamberHtml}
          </div>
        </div>
      </article>
    `;
  }

  function initPhotoFallback() {
    document.querySelectorAll(".doctor-photo-wrap img.doctor-photo").forEach((img) => {
      img.addEventListener("error", function () {
        const fallback = document.createElement("div");
        fallback.className = "doctor-photo fallback-photo";
        fallback.textContent = this.getAttribute("data-initial") || "D";
        this.replaceWith(fallback);
      }, { once: true });
    });
  }

  // Wires up the "Copy profile link" button after the profile is rendered.
  // Uses the modern Clipboard API with a legacy execCommand fallback for
  // older mobile browsers, and always shows clear "copied"/"failed" feedback.
  function initCopyLink() {
    const btn = document.getElementById("profile-copy-link");
    const feedback = document.getElementById("profile-copy-feedback");
    if (!btn) return;

    let resetTimer = null;

    function showFeedback(message, ok) {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.className = "profile-copy-feedback " + (ok ? "ok" : "fail");
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        feedback.textContent = "";
        feedback.className = "profile-copy-feedback";
      }, 4000);
    }

    function legacyCopy(value) {
      try {
        const temp = document.createElement("textarea");
        temp.value = value;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(temp);
        return ok;
      } catch (_) {
        return false;
      }
    }

    btn.addEventListener("click", async function () {
      const link = window.location.href;
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(link);
          copied = true;
        } catch (_) {
          copied = legacyCopy(link);
        }
      } else {
        copied = legacyCopy(link);
      }

      if (copied) {
        const message = text("Link copied!", "লিংক কপি হয়েছে!");
        showFeedback(message, true);
        if (window.rxpulseShowToast) window.rxpulseShowToast(message, "success", 2800);
      } else {
        const message = text("Copy failed. Please copy from the address bar.", "কপি করা যায়নি। অ্যাড্রেস বার থেকে কপি করুন।");
        showFeedback(message, false);
        if (window.rxpulseShowToast) window.rxpulseShowToast(message, "error", 3800);
      }
    });
  }

  async function init() {
    const slug = currentSlugFromPath();
    if (!slug) {
      renderState("hidden", text("Profile not found", "প্রোফাইল পাওয়া যায়নি"), text("The doctor profile link is incomplete. Please use the full public profile link shared by the doctor.", "ডাক্তার প্রোফাইল লিংকটি অসম্পূর্ণ। অনুগ্রহ করে ডাক্তারের দেওয়া সম্পূর্ণ পাবলিক প্রোফাইল লিংক ব্যবহার করুন।"));
      return;
    }

    renderLoading();

    try {
      const profile = await findProfile(slug);
      if (!profile || profile.isApproved !== true || profile.approvalStatus !== "approved") {
        renderState("hidden", text("Profile not available", "প্রোফাইলটি পাওয়া যাচ্ছে না"), text("This doctor profile is not public right now. It may be awaiting approval or hidden because the subscription is not active.", "এই ডাক্তার প্রোফাইলটি এখন পাবলিক নয়। অনুমোদন বাকি থাকতে পারে অথবা সক্রিয় সাবস্ক্রিপশন না থাকায় লুকানো থাকতে পারে।"));
        return;
      }

      const doctorId = profile.doctorId || profile.id;
      const chamberData = await loadChamberData(doctorId);
      const chamberHtml = renderChamberWidget(chamberData.chambers, chamberData.schedule, chamberData.overrides);
      document.title = `${profile.name || "Doctor"} | RxPulse Public Portfolio`;
      root.innerHTML = renderTemplate(profile, chamberHtml);
      initPhotoFallback();
      initCopyLink();
    } catch (error) {
      console.error("[RxPulse Public Profile]", error);
      // Network/timeout failures are retryable; show a Try-again button so doctors
      // on unstable internet can recover without reloading the whole page.
      const isNetwork = Boolean(error && (error.isNetwork || error.name === "AbortError" || error.name === "TypeError"));
      if (isNetwork) {
        renderState(
          "error",
          text("Connection problem", "সংযোগ সমস্যা"),
          text("We could not load this profile. Please check your internet and try again.", "প্রোফাইলটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
          { showRetry: true }
        );
      } else {
        renderState(
          "error",
          text("Unable to load profile", "প্রোফাইল লোড করা যাচ্ছে না"),
          text("Please try again later or contact support if the problem continues.", "পরে আবার চেষ্টা করুন। সমস্যা থাকলে সাপোর্টে যোগাযোগ করুন।"),
          { showRetry: true }
        );
      }
    }
  }

  init();
})();

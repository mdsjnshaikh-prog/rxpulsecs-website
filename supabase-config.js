// RxPulse public website runtime configuration.
// Safe for public website only when it contains public values.
// NEVER paste service-role keys or private secrets here.

window.RXPULSE_SUPABASE_URL = "https://szlmjdamoupuugldnkda.supabase.co";
window.RXPULSE_PUBLIC_SIGNUP_FUNCTION = "https://szlmjdamoupuugldnkda.supabase.co/functions/v1/public-doctor-signup";
window.RXPULSE_FORGOT_PASSWORD_FUNCTION = "https://szlmjdamoupuugldnkda.supabase.co/functions/v1/forgot-password";
window.RXPULSE_TURNSTILE_SITE_KEY = "0x4AAAAAADh1hSwbScv1YXhK";

// Required for reset-password.html because Supabase JS must process the recovery session.
// Paste the public anon key from:
// Supabase Dashboard → Project Settings → API → Project API keys → anon public
window.RXPULSE_SUPABASE_ANON_KEY = "PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE";

window.rxpulseHasSupabaseAnonKey = function () {
  return Boolean(
    window.RXPULSE_SUPABASE_URL &&
    window.RXPULSE_SUPABASE_ANON_KEY &&
    window.RXPULSE_SUPABASE_ANON_KEY !== "PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE"
  );
};

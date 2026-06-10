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
    window.RXPULSE_SUPABASE_ANON_KEY !== "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bG1qZGFtb3VwdXVnbGRua2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTcwODIsImV4cCI6MjA5NDc3MzA4Mn0.zepuHV0BaNnksFHkirbgIRzPlIy_T22U8PmLQ_IAg-c"
  );
};

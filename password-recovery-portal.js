(function () {
  const requestedPortal = new URLSearchParams(window.location.search).get("portal");
  const recoveryPortal = requestedPortal === "admin" ? "admin" : "doctor";
  const originalFetch = window.fetch;

  window.RXPULSE_PASSWORD_RECOVERY_PORTAL = recoveryPortal;

  if (typeof originalFetch !== "function") return;

  window.fetch = function (input, init) {
    const requestUrl = typeof input === "string" ? input : input && input.url;
    const forgotEndpoint = window.RXPULSE_FORGOT_PASSWORD_FUNCTION;

    if (
      forgotEndpoint &&
      requestUrl === forgotEndpoint &&
      init &&
      typeof init.body === "string"
    ) {
      try {
        const payload = JSON.parse(init.body);
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          payload.portal = recoveryPortal;
          init = Object.assign({}, init, { body: JSON.stringify(payload) });
        }
      } catch (_) {
        // Preserve the original request when the body is not valid JSON.
      }
    }

    return originalFetch.call(this, input, init);
  };
})();

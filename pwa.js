(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(err => {
      console.warn("PWA service worker registration failed:", err);
    });
  });
})();

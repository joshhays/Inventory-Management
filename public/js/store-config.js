/**
 * Store config - must run before other store scripts.
 * When served from /store/:slug/..., STORE_BASE and STORE_SLUG are injected by the server.
 * Fallback: parse from path.
 */
(function () {
  const m = window.location.pathname.match(/^\/store\/([^/]+)/);
  window.STORE_BASE = typeof __STORE_BASE__ !== "undefined" ? __STORE_BASE__ : (m ? "/store/" + m[1] : "/store");
  window.STORE_SLUG = typeof __STORE_SLUG__ !== "undefined" ? __STORE_SLUG__ : (m ? m[1] : null);
  window.STORE_CART_KEY = window.STORE_SLUG ? "storeCart_" + window.STORE_SLUG : "storeCart";
  window.STORE_API_PARAMS = window.STORE_SLUG ? "?deployment=" + encodeURIComponent(window.STORE_SLUG) : "";
})();

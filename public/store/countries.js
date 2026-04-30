/**
 * Country list for store checkout (full ISO 3166-1 alpha-2 set).
 * Depends on ../iso3166-slim-2.bundle.js (must load before this file).
 * Default: United States first in the list and selected (value US).
 */
(function () {
  var MINIMAL_FALLBACK = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "MX", name: "Mexico" },
    { code: "GB", name: "United Kingdom" },
  ];

  function friendlyName(code, name) {
    if (!code) return name || "";
    if (code.toUpperCase() === "US") return "United States";
    return name || code;
  }

  /** Primary: static bundle from ISO 3166 slim-2 (see iso3166-slim-2.bundle.js). */
  function buildFromStaticBundle() {
    var raw = window.ISO3166_SLIM2;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      if (!r || !r.code) continue;
      var code = String(r.code).toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) continue;
      out.push({ code: code, name: friendlyName(code, r.name) });
    }
    out.sort(function (a, b) {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    return out.length ? out : null;
  }

  /** Optional extra regions from Intl when supported (browser); merges unique codes. */
  function mergeIntlExtras(base) {
    if (typeof Intl === "undefined" || typeof Intl.supportedValuesOf !== "function") return base;
    var dn;
    try {
      dn = new Intl.DisplayNames(["en"], { type: "region" });
    } catch (e) {
      return base;
    }
    var seen = {};
    for (var i = 0; i < base.length; i++) seen[base[i].code] = true;
    var regions;
    try {
      regions = Intl.supportedValuesOf("region");
    } catch (e) {
      return base;
    }
    var extra = [];
    for (var j = 0; j < regions.length; j++) {
      var r = regions[j];
      if (typeof r !== "string" || r.length !== 2) continue;
      var code = r.toUpperCase();
      if (!/^[A-Z]{2}$/.test(code) || seen[code]) continue;
      var name;
      try {
        name = dn.of(code);
      } catch (e) {
        name = code;
      }
      if (!name) continue;
      seen[code] = true;
      extra.push({ code: code, name: friendlyName(code, name) });
    }
    if (!extra.length) return base;
    extra.sort(function (a, b) {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    return base.concat(extra);
  }

  function pinUnitedStatesFirst(opts) {
    var us = null;
    var rest = [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].code === "US") us = opts[i];
      else rest.push(opts[i]);
    }
    if (!us) return opts;
    return [us].concat(rest);
  }

  function getStoreCountryOptions() {
    var list = buildFromStaticBundle();
    if (!list || !list.length) list = MINIMAL_FALLBACK.slice();
    else list = mergeIntlExtras(list);
    return pinUnitedStatesFirst(list);
  }

  window.getStoreCountryOptions = getStoreCountryOptions;
  window.STORE_COUNTRY_OPTIONS = getStoreCountryOptions();
})();

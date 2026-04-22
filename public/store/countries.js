/**
 * Full country list for store checkout (all ISO-3166-1 alpha-2 regions the runtime supports).
 * Default selection: United States (US).
 */
(function () {
  var MINIMAL_FALLBACK = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "MX", name: "Mexico" },
    { code: "GB", name: "United Kingdom" },
  ];

  function buildFromIntl() {
    if (typeof Intl === "undefined" || typeof Intl.supportedValuesOf !== "function") return null;
    var regions;
    try {
      regions = Intl.supportedValuesOf("region");
    } catch (e) {
      return null;
    }
    var dn;
    try {
      dn = new Intl.DisplayNames(["en"], { type: "region" });
    } catch (e) {
      return null;
    }
    var out = [];
    for (var i = 0; i < regions.length; i++) {
      var r = regions[i];
      if (typeof r !== "string" || r.length !== 2) continue;
      var code = r.toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) continue;
      var name;
      try {
        name = dn.of(code);
      } catch (e) {
        name = code;
      }
      if (name) out.push({ code: code, name: name });
    }
    out.sort(function (a, b) {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    return out.length > 0 ? out : null;
  }

  /** United States first, then all others A–Z (easier default + full list). */
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

  /**
   * @returns {Array<{ code: string, name: string }>}
   */
  function getStoreCountryOptions() {
    var built = buildFromIntl();
    var list = built && built.length ? built : MINIMAL_FALLBACK;
    return pinUnitedStatesFirst(list);
  }

  window.getStoreCountryOptions = getStoreCountryOptions;
  window.STORE_COUNTRY_OPTIONS = getStoreCountryOptions();
})();

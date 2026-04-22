/**
 * EasyPost shipping service - create labels, get rates
 * Docs: https://www.easypost.com/docs
 * Domestic (US) rates: UPSDAP-only (existing). International: all carrier rates; customs use env (see below).
 */

const EasyPost = require("@easypost/api");

function getClient() {
  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey) throw new Error("EASYPOST_API_KEY is required");
  return new EasyPost(apiKey);
}

function getOriginAddress() {
  return {
    name: process.env.EASYPOST_ORIGIN_NAME || "Shipper",
    street1: process.env.EASYPOST_ORIGIN_STREET1 || "123 Main St",
    city: process.env.EASYPOST_ORIGIN_CITY || "Chicago",
    state: process.env.EASYPOST_ORIGIN_STATE || "IL",
    zip: process.env.EASYPOST_ORIGIN_ZIP || "60601",
    country: process.env.EASYPOST_ORIGIN_COUNTRY || "US",
  };
}

/** @param {unknown} raw */
function normalizeCountryCode(raw) {
  if (raw == null) return "US";
  const s = String(raw).trim();
  if (s === "") return "US";
  if (s.length === 2) return s.toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function isUsDomestic(countryCode) {
  return normalizeCountryCode(countryCode) === "US";
}

/**
 * Filter EasyPost rates to only UPSDAP (UPS Delivery Access Point) options — used for US domestic.
 * @param {Array} rates - EasyPost rate objects
 * @returns {Array} Rates where service or carrier includes UPSDAP
 */
function filterUpsdapRates(rates) {
  return (rates || []).filter(
    (r) =>
      (r.service && String(r.service).toUpperCase().includes("UPSDAP")) ||
      (r.carrier && String(r.carrier).toUpperCase().includes("UPSDAP"))
  );
}

/**
 * @param {Array} allRates
 * @param {string} countryCode
 */
function pickRatesForDestination(allRates, countryCode) {
  if (isUsDomestic(countryCode)) {
    return filterUpsdapRates(allRates);
  }
  return (allRates || []).filter((r) => r && r.rate != null);
}

/**
 * Parcel `weight` in this app is treated as pounds (matches shipping tiers / defaults).
 * @param {Object} parcelData
 * @returns {number} weight in ounces for EasyPost customs line items
 */
function parcelWeightOuncesForCustoms(parcelData) {
  const w = Number(parcelData?.weight) || 1;
  return Math.max(0.1, w * 16);
}

/**
 * EasyPost requires a CustomsInfo object for non-US destinations.
 * Tune via EASYPOST_CUSTOMS_*, EASYPOST_HTS, EASYPOST_DECLARED_VALUE.
 */
async function buildCustomsInfoForParcel(client, parcelData) {
  const weightOz = parcelWeightOuncesForCustoms(parcelData);
  const value = Math.max(1, parseFloat(process.env.EASYPOST_DECLARED_VALUE || process.env.EASYPOST_CUSTOMS_VALUE_USD) || 20);
  const hs = String(process.env.EASYPOST_HTS || "490199")
    .replace(/\D/g, "")
    .slice(0, 10);
  const customsItem = {
    description: String(
      process.env.EASYPOST_CUSTOMS_ITEM_DESC || "Printed business cards and paper products"
    ).trim(),
    quantity: 1,
    weight: weightOz,
    value,
    hs_tariff_number: hs || "490199",
    origin_country: process.env.EASYPOST_ORIGIN_COUNTRY || "US",
  };
  return client.CustomsInfo.create({
    customs_certify: true,
    customs_signer: String(
      process.env.EASYPOST_CUSTOMS_SIGNER || process.env.EASYPOST_ORIGIN_NAME || "Shipper"
    ).trim(),
    contents_type: "merchandise",
    contents_explanation: String(
      process.env.EASYPOST_CUSTOMS_EXPLANATION || "Printed paper products"
    ).trim(),
    restriction_type: "none",
    eel_pfc: String(process.env.EASYPOST_EEL_PFC || "NOEEI_30_37_a").trim(),
    non_delivery_option: "return",
    customs_items: [customsItem],
  });
}

/** @param {object} client - EasyPost client instance */
async function buildShipmentCreateParams(client, fromAddress, toAddress, parcelData, countryCode) {
  if (isUsDomestic(countryCode)) {
    return { from_address: fromAddress, to_address: toAddress, parcel: parcelData };
  }
  const customs = await buildCustomsInfoForParcel(client, parcelData);
  return {
    from_address: fromAddress,
    to_address: toAddress,
    parcel: parcelData,
    customs_info: { id: customs.id },
  };
}

/**
 * Parse shipping address from Order (JSON string or object)
 */
function parseShippingAddress(shippingAddress) {
  if (!shippingAddress) throw new Error("Shipping address is required");
  const addr =
    typeof shippingAddress === "string" ? JSON.parse(shippingAddress) : shippingAddress;
  const stateRaw = addr.state != null ? String(addr.state).trim() : "";
  return {
    name: addr.name || "Recipient",
    street1: addr.address1 || addr.street1,
    street2: addr.address2 || addr.street2 || undefined,
    city: addr.city,
    state: stateRaw || undefined,
    zip: addr.zip,
    country: normalizeCountryCode(addr.country),
    company: addr.company || undefined,
    phone: addr.phone || undefined,
  };
}

/**
 * @param {Object} d - { name, address1, address2?, city, state, zip, countryCode? }
 */
function buildToAddressForRates(d) {
  const stateRaw = d.state != null && String(d.state).trim() !== "" ? String(d.state).trim() : undefined;
  return {
    name: d.name || "Recipient",
    street1: d.address1,
    street2: d.address2 || undefined,
    city: d.city,
    state: stateRaw,
    zip: String(d.zip || "").trim(),
    country: normalizeCountryCode(d.countryCode),
  };
}

/**
 * Get shipping rates for an address (no purchase).
 * Creates an EasyPost Shipment to fetch rates, returns formatted for cart display.
 * Uses ShippingTier if deploymentId provided and tiers exist; otherwise uses defaults.
 *
 * @param {Object} dest - { name, address1, address2?, city, state, zip, countryCode? }
 * @param {number} itemCount - Total item count in cart
 * @param {number} [deploymentId] - Optional; if set, look up tier for weight/dimensions
 * @returns {Promise<Array<{ serviceCode, serviceName, totalCharges, currencyCode, transitDays? }>>}
 */
async function getRates(dest, itemCount, deploymentId = null) {
  const client = getClient();
  const fromAddress = getOriginAddress();
  const toAddress = buildToAddressForRates(dest);
  const destCountry = toAddress.country;

  let weightLbs = itemCount * 1;
  let parcelData = {
    length: Number(process.env.EASYPOST_PARCEL_LENGTH) || 8,
    width: Number(process.env.EASYPOST_PARCEL_WIDTH) || 5,
    height: Number(process.env.EASYPOST_PARCEL_HEIGHT) || 5,
    weight: weightLbs,
  };

  if (deploymentId) {
    const shippingTierService = require("./shippingTier.service");
    const tier = await shippingTierService.findTierForQuantity(deploymentId, itemCount);
    if (tier) {
      weightLbs = tier.weightLbs;
      parcelData = {
        length: tier.lengthInches,
        width: tier.widthInches,
        height: tier.heightInches,
        weight: weightLbs,
      };
    }
  }

  const createParams = await buildShipmentCreateParams(
    client,
    fromAddress,
    toAddress,
    parcelData,
    destCountry
  );
  const shipment = await client.Shipment.create(createParams);

  const chosen = pickRatesForDestination(shipment.rates, destCountry);
  const allRates = shipment.rates || [];
  const SHIPPING_SURCHARGE = 10;

  const rates = chosen.map((r) => {
    let serviceName = `${r.carrier} ${r.service}`.trim();
    serviceName = serviceName.replace(/\bUPSDAP\b/gi, "UPS");
    return {
      serviceCode: r.id || `${r.carrier}_${r.service}`,
      serviceName,
      totalCharges: (parseFloat(r.rate) || 0) + SHIPPING_SURCHARGE,
      currencyCode: r.currency || "USD",
      transitDays: r.delivery_days != null ? r.delivery_days : null,
    };
  });

  return rates.sort((a, b) => a.totalCharges - b.totalCharges);
}

/**
 * Create a shipping label for an order.
 * Creates an EasyPost Shipment, buys the cheapest rate, returns label URL and tracking code.
 *
 * @param {Object} orderDetails - Order with shippingAddress (JSON), optional parcel overrides
 * @param {Object} [parcel] - Optional { length, width, height, weight } in inches/lbs
 * @param {Object} [opts] - Optional { deploymentId, itemCount } to use shipping tier for parcel
 * @returns {Promise<{ labelUrl: string, trackingCode: string, easypostShipmentId: string }>}
 */
async function createLabel(orderDetails, parcel = null, opts = {}) {
  const client = getClient();
  const fromAddress = getOriginAddress();
  const toParsed = parseShippingAddress(orderDetails.shippingAddress);
  const toAddress = toParsed;
  const destCountry = toParsed.country;

  let parcelData = parcel;
  if (!parcelData && opts.deploymentId != null && opts.itemCount != null) {
    const shippingTierService = require("./shippingTier.service");
    const tier = await shippingTierService.findTierForQuantity(opts.deploymentId, opts.itemCount);
    if (tier) {
      parcelData = {
        length: tier.lengthInches,
        width: tier.widthInches,
        height: tier.heightInches,
        weight: tier.weightLbs,
      };
    }
  }
  if (!parcelData) {
    parcelData = {
      length: Number(process.env.EASYPOST_PARCEL_LENGTH) || 8,
      width: Number(process.env.EASYPOST_PARCEL_WIDTH) || 5,
      height: Number(process.env.EASYPOST_PARCEL_HEIGHT) || 5,
      weight: Number(process.env.EASYPOST_PARCEL_WEIGHT) || 1,
    };
  }

  const createParams = await buildShipmentCreateParams(
    client,
    fromAddress,
    toAddress,
    parcelData,
    destCountry
  );
  const shipment = await client.Shipment.create(createParams);

  const allRates = shipment.rates || [];
  const candidateRates = pickRatesForDestination(allRates, destCountry);
  const lowestRate =
    candidateRates.length > 0
      ? candidateRates.reduce((a, b) => (parseFloat(a.rate) < parseFloat(b.rate) ? a : b))
      : null;

  if (!lowestRate) {
    const isUs = isUsDomestic(destCountry);
    if (isUs) {
      throw new Error(
        filterUpsdapRates(allRates).length === 0 && allRates.length > 0
          ? "No UPSDAP shipping rates available for this address"
          : "No shipping rates available for this address"
      );
    }
    throw new Error(
      allRates.length > 0
        ? "No international shipping rates available for this address (try another service or check customs settings)"
        : "No shipping rates available for this address"
    );
  }

  const boughtShipment = await client.Shipment.buy(shipment.id, lowestRate);

  const labelUrl = boughtShipment.postage_label?.label_url;
  const trackingCode = boughtShipment.tracking_code;

  if (!labelUrl || !trackingCode) {
    throw new Error("EasyPost did not return label URL or tracking code");
  }

  return {
    labelUrl,
    trackingCode,
    easypostShipmentId: boughtShipment.id,
  };
}

/**
 * Refund / void an EasyPost shipment (unused label). Safe to call if already refunded.
 * @param {string} shipmentId - EasyPost shipment id (e.g. shp_...)
 * @returns {Promise<{ ok: boolean, skipped?: boolean, message?: string }>}
 */
async function refundShipment(shipmentId) {
  if (!shipmentId || String(shipmentId).trim() === "") {
    return { ok: true, skipped: true };
  }
  try {
    const client = getClient();
    await client.Shipment.refund(String(shipmentId).trim());
    return { ok: true };
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn("[EasyPost] refundShipment failed:", msg);
    return { ok: false, message: msg };
  }
}

module.exports = {
  getRates,
  createLabel,
  refundShipment,
  getOriginAddress,
  parseShippingAddress,
  normalizeCountryCode,
  isUsDomestic,
};

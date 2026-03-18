/**
 * EasyPost shipping service - create labels, get rates
 * Docs: https://www.easypost.com/docs
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

/**
 * Parse shipping address from Order (JSON string or object)
 */
function parseShippingAddress(shippingAddress) {
  if (!shippingAddress) throw new Error("Shipping address is required");
  const addr =
    typeof shippingAddress === "string" ? JSON.parse(shippingAddress) : shippingAddress;
  return {
    name: addr.name || "Recipient",
    street1: addr.address1 || addr.street1,
    street2: addr.address2 || addr.street2 || undefined,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
    country: addr.country || "US",
    company: addr.company || undefined,
    phone: addr.phone || undefined,
  };
}

/**
 * Get shipping rates for an address (no purchase).
 * Creates an EasyPost Shipment to fetch rates, returns formatted for cart display.
 * Uses ShippingTier if deploymentId provided and tiers exist; otherwise uses defaults.
 *
 * @param {Object} dest - { name, address1, address2?, city, state, zip }
 * @param {number} itemCount - Total item count in cart
 * @param {number} [deploymentId] - Optional; if set, look up tier for weight/dimensions
 * @returns {Promise<Array<{ serviceCode, serviceName, totalCharges, currencyCode, transitDays? }>>}
 */
async function getRates(dest, itemCount, deploymentId = null) {
  const client = getClient();
  const fromAddress = getOriginAddress();
  const toAddress = {
    name: dest.name || "Recipient",
    street1: dest.address1,
    street2: dest.address2 || undefined,
    city: dest.city,
    state: dest.state,
    zip: dest.zip,
    country: dest.countryCode || "US",
  };

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

  const shipment = await client.Shipment.create({
    from_address: fromAddress,
    to_address: toAddress,
    parcel: parcelData,
  });

  const rates = (shipment.rates || []).map((r) => ({
    serviceCode: r.id || `${r.carrier}_${r.service}`,
    serviceName: `${r.carrier} ${r.service}`.trim(),
    totalCharges: parseFloat(r.rate) || 0,
    currencyCode: r.currency || "USD",
    transitDays: r.delivery_days != null ? r.delivery_days : null,
  }));

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
  const toAddress = parseShippingAddress(orderDetails.shippingAddress);

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

  const shipment = await client.Shipment.create({
    from_address: fromAddress,
    to_address: toAddress,
    parcel: parcelData,
  });

  const lowestRate = shipment.lowestRate();
  if (!lowestRate) {
    throw new Error("No shipping rates available for this address");
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

module.exports = {
  getRates,
  createLabel,
  getOriginAddress,
  parseShippingAddress,
};

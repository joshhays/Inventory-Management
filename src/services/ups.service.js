/**
 * UPS Rating API service - OAuth 2.0 + Rate/Shop
 * Docs: https://developer.ups.com/api/reference
 */

const https = require("https");

const SANDBOX_BASE = "https://wwwcie.ups.com";
const PROD_BASE = "https://onlinetools.ups.com";

let cachedToken = null;
let tokenExpiresAt = 0;

function getBaseUrl() {
  const useSandbox = process.env.UPS_USE_SANDBOX !== "false";
  return useSandbox ? SANDBOX_BASE : PROD_BASE;
}

function getClientCredentials() {
  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("UPS_CLIENT_ID and UPS_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

function getOriginAddress() {
  return {
    name: process.env.UPS_ORIGIN_NAME || "Shipper",
    address1: process.env.UPS_ORIGIN_ADDRESS1 || "123 Main St",
    city: process.env.UPS_ORIGIN_CITY || "Chicago",
    state: process.env.UPS_ORIGIN_STATE || "IL",
    zip: process.env.UPS_ORIGIN_ZIP || "60601",
    countryCode: process.env.UPS_ORIGIN_COUNTRY || "US",
  };
}

function httpsPost(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : null;
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: options.method || "POST",
        headers: {
          "Content-Type": options.contentType || "application/json",
          ...options.headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (ch) => (data += ch));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(options.json !== false ? JSON.parse(data) : data);
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`UPS API error ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }
  const { clientId, clientSecret } = getClientCredentials();
  const base = getBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await httpsPost(`${base}/security/v1/oauth/token`, {
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "x-merchant-id": clientId,
    },
    json: false,
  });
  const parsed = JSON.parse(res);
  cachedToken = parsed.access_token;
  const expiresIn = (parsed.expires_in || 3600) * 1000;
  tokenExpiresAt = now + expiresIn;
  return cachedToken;
}

/**
 * Get shipping rates from UPS Rating API (Shop = all products)
 * @param {Object} dest - { name, address1, address2?, city, state, zip }
 * @param {number} weightLbs - Total package weight in pounds
 * @param {Object} [dims] - Optional { length, width, height } in inches
 * @returns {Promise<Array<{ serviceCode, serviceName, totalCharges, currencyCode, transitDays? }>>}
 */
async function getRates(dest, weightLbs, dims = null) {
  const token = await getAccessToken();
  const origin = getOriginAddress();
  const base = getBaseUrl();

  const addressLines = [dest.address1].filter(Boolean);
  if (dest.address2) addressLines.push(dest.address2);

  const packagePayload = {
    PackagingType: {
      Code: "02",
      Description: "Package",
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: "LBS", Description: "Pounds" },
      Weight: String(Math.max(0.1, Math.ceil(weightLbs * 10) / 10)),
    },
  };
  if (dims && dims.width && dims.height) {
    packagePayload.Dimensions = {
      UnitOfMeasurement: { Code: "IN", Description: "Inches" },
      Length: String(Math.round(dims.length || 1)),
      Width: String(Math.round(dims.width || 1)),
      Height: String(Math.round(dims.height || 1)),
    };
  }

  const accountNumber = process.env.UPS_ACCOUNT_NUMBER?.trim() || "";
  const rateRequest = {
    RateRequest: {
      Request: {
        RequestOption: "Shop",
      },
      Shipment: {
        Shipper: {
          Name: origin.name,
          ...(accountNumber && { ShipperNumber: accountNumber }),
          Address: {
            AddressLine: [origin.address1],
            City: origin.city,
            StateProvinceCode: origin.state,
            PostalCode: origin.zip,
            CountryCode: origin.countryCode,
          },
        },
        ShipTo: {
          Name: dest.name || "Recipient",
          Address: {
            AddressLine,
            City: dest.city,
            StateProvinceCode: dest.state,
            PostalCode: dest.zip,
            CountryCode: dest.countryCode || "US",
          },
        },
        ShipFrom: {
          Name: origin.name,
          Address: {
            AddressLine: [origin.address1],
            City: origin.city,
            StateProvinceCode: origin.state,
            PostalCode: origin.zip,
            CountryCode: origin.countryCode,
          },
        },
        PaymentDetails: {
          ShipmentCharge: [
            {
              Type: "01",
              BillShipper: {
                AccountNumber: accountNumber,
              },
            },
          ],
        },
        ...(accountNumber && {
          ShipmentRatingOptions: {
            NegotiatedRatesIndicator: "Y",
          },
        }),
        Package: packagePayload,
      },
    },
  };

  const transId = `rate-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.slice(0, 32);
  const res = await httpsPost(`${base}/api/rating/v2403/Shop`, {
    body: rateRequest,
    headers: {
      Authorization: `Bearer ${token}`,
      transId,
      transactionSrc: "inventory-system",
    },
  });

  const ratedShipment = res?.RateResponse?.RatedShipment;
  if (!Array.isArray(ratedShipment) && !ratedShipment) {
    const errMsg = res?.RateResponse?.Response?.Error?.ErrorDescription || "No rates returned";
    throw new Error(errMsg);
  }

  const list = Array.isArray(ratedShipment) ? ratedShipment : [ratedShipment];
  const rates = [];
  for (const r of list) {
    const service = r.Service || {};
    const negotiated = r.NegotiatedRateCharges?.TotalCharge;
    const totalCharges = negotiated || r.TotalCharges || {};
    const monetary = totalCharges.MonetaryValue ?? totalCharges;
    const currency = totalCharges.CurrencyCode || "USD";
    const transit = r.TimeInTransit?.ServiceSummary;
    let transitDays = null;
    if (transit) {
      const t = Array.isArray(transit) ? transit[0] : transit;
      transitDays = t?.EstimatedArrival?.BusinessDaysInTransit ?? t?.BusinessDaysInTransit;
    }
    rates.push({
      serviceCode: service.Code || "",
      serviceName: service.Name || service.Description || "UPS Shipping",
      totalCharges: parseFloat(monetary) || 0,
      currencyCode: currency,
      transitDays: transitDays != null ? Number(transitDays) : null,
    });
  }
  return rates.sort((a, b) => a.totalCharges - b.totalCharges);
}

module.exports = {
  getAccessToken,
  getRates,
  getOriginAddress,
};

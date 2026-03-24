/**
 * Wasabi (S3-compatible) presigned URL utility.
 * Use when bucket is private - generates time-limited signed URLs for frontend access.
 *
 * Required env vars:
 *   WASABI_ACCESS_KEY_ID
 *   WASABI_SECRET_ACCESS_KEY
 *   WASABI_BUCKET
 *   WASABI_REGION (default: us-east-1)
 *   WASABI_ENDPOINT (e.g. https://s3.wasabisys.com)
 */

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client } = require("@aws-sdk/client-s3");

let _client = null;

function getS3Client() {
  if (_client) return _client;
  const accessKey = process.env.WASABI_ACCESS_KEY_ID;
  const secretKey = process.env.WASABI_SECRET_ACCESS_KEY;
  const bucket = process.env.WASABI_BUCKET;
  const region = process.env.WASABI_REGION || "us-east-1";
  const endpoint = process.env.WASABI_ENDPOINT;

  if (!accessKey || !secretKey || !bucket || !endpoint) {
    return null;
  }

  _client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });
  return _client;
}

function isS3Configured() {
  return getS3Client() !== null;
}

/**
 * Get a presigned URL for a file, valid for 1 hour.
 * @param {string} fileKey - S3 object key (e.g. "deployment-logos/logo.png", "products/product-1/image.jpg")
 * @returns {Promise<string|null>} Presigned URL or null if S3 not configured
 */
async function getPresignedUrl(fileKey) {
  const client = getS3Client();
  if (!client) return null;

  if (!fileKey || typeof fileKey !== "string" || !fileKey.trim()) {
    return null;
  }

  const key = fileKey.replace(/^\/+/, "");
  if (!key) return null;

  try {
    const bucket = process.env.WASABI_BUCKET;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return url;
  } catch (err) {
    console.warn("Presigned URL error:", err.message);
    return null;
  }
}

module.exports = {
  getPresignedUrl,
  isS3Configured,
};

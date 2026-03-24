/**
 * Wasabi (S3-compatible) service for presigned URLs and file uploads.
 * Keeps bucket private - generates temporary signed URLs for frontend access.
 *
 * Env vars: WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET, WASABI_REGION, WASABI_ENDPOINT
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.WASABI_REGION,
  endpoint: process.env.WASABI_ENDPOINT,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY,
    secretAccessKey: process.env.WASABI_SECRET_KEY,
  },
  forcePathStyle: true, // Necessary for Wasabi/S3-compatible storage
});

function isConfigured() {
  return !!(
    process.env.WASABI_ACCESS_KEY &&
    process.env.WASABI_SECRET_KEY &&
    process.env.WASABI_BUCKET
  );
}

const wasabiService = {
  isConfigured,

  // 1. Generate a "Timed Pass" for the browser to view a private image
  async getImageUrl(fileKey) {
    if (!fileKey || !isConfigured()) return null;
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.WASABI_BUCKET,
        Key: fileKey,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (_) {
      return null;
    }
  },

  // 2. Upload a file (Logo, Product Image, etc.)
  async uploadFile(fileBuffer, fileName, contentType, subfolder) {
    if (!isConfigured()) return null;
    const base = subfolder ? `uploads/${subfolder}` : "uploads";
    const fileKey = `${base}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.WASABI_BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return fileKey; // Save THIS string in your Postgres database
  },
};

module.exports = wasabiService;

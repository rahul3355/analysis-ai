export interface StorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  accountId: string;
}

export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const accountId = process.env.R2_ACCOUNT_ID;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !accountId) {
    throw new Error(
      "Missing R2 storage config. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_ACCOUNT_ID in .env.local"
    );
  }

  return { endpoint, accessKeyId, secretAccessKey, bucketName, accountId };
}

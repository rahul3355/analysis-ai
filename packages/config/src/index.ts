export function validateEnv(): void {
  const required = [
    "OPENROUTER_API_KEY",
    "PINECONE_API_KEY",
    "PINECONE_INDEX_HOST",
    "GOOGLE_PROJECT_ID",
    "BQ_KEY_FILE",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_ACCOUNT_ID",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

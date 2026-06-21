export function register() {
  if (!process.env.ARIZE_SPACE_ID || !process.env.ARIZE_API_KEY) {
    console.warn("[otel] ARIZE_SPACE_ID or ARIZE_API_KEY not set — skipping OTEL initialization");
  }
}

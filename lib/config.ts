// Vaastav Configuration
// Centralized model constants configured for Google Gen AI SDK
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const FALLBACK_MODEL = process.env.GEMINI_MODEL_FALLBACK || "gemini-3.5-flash";

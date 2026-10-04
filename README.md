# TruthLens (SachPrism)

Next.js app that splits forwards into claims and verifies them with Google Gemini (server-side only).

## Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and add **your own** API key locally:

   ```bash
   cp .env.example .env.local
   ```

   On Windows (PowerShell):

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Open `.env.local` and set `GEMINI_API_KEY` to a key from [Google AI Studio](https://aistudio.google.com/). Optional: adjust `GEMINI_MODEL` and `GEMINI_MODEL_FALLBACK`.

4. **Never commit `.env.local` or any file containing real API keys.** Only `.env.example` (empty placeholders) belongs in git.

5. Run the dev server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint

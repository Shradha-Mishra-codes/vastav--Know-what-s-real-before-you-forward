# Vaastav (वास्तव)

> **Know what's real before you forward.**

Vaastav is a modern fact-checking application that splits WhatsApp forwards, news, health tips, and government scheme claims into atomic factual statements, verifies each claim against trusted sources with citations, and explains verdicts in plain language. Includes **Sakhi (सखी)**, your warm in-app conversational fact-checking companion.

## Features

- **Multimodal Fact-Checking**: Paste text, upload screenshots, send voice notes, upload PDFs (up to 20 pages), or verify webpage links.
- **Atomic Claim Extraction & Verification**: Powered by Google Gemini with live Google Search grounding.
- **Lavender Sky Design**: Clean, vibrant, high-contrast accessible interface with animated background.
- **Sakhi AI Companion**: Conversational voice & text friend for fact-checking forwards, answering questions, and explaining verdicts in English, Hindi, Hinglish, Marathi, Urdu, and Tamil.
- **Privacy & Safety**: Encrypted in transit, nothing stored on external servers, local device-only history, and one-click data erasure.
- **Shareable Verdicts**: Downloadable WhatsApp share cards, verification certificates with QR codes, and formatted copy-to-clipboard summaries.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and set your API key in `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   On Windows (PowerShell):

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Open `.env.local` and set `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/).

4. Run the development server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint

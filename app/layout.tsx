import type { Metadata } from "next";
import { Sora, Instrument_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vaastav – Know what's real before you forward",
  description:
    "Paste, upload or share a forward. Vaastav checks each claim against trusted sources and explains the verdict in simple words.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${sora.variable} ${notoSansDevanagari.variable}`}
    >
      <body className="min-h-screen font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

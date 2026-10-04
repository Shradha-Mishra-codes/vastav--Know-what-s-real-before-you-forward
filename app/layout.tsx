import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:"SachPrism – See every side of a forward",
  description: "Split a forward into claims and review each verdict, source, and confidence level.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import "./workspace-pages.css";

export const metadata: Metadata = {
  title: "PayProof AI — Payment operations, with proof",
  description:
    "An evidence-first workspace for PayPal payment verification, AI-assisted explanations, exception review and auditability.",
  applicationName: "PayProof AI"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Marcellus&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

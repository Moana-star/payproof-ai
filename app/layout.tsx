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
      <body>{children}</body>
    </html>
  );
}

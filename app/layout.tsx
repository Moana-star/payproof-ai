import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayProof AI — Payment operations, with proof",
  description:
    "A clear workspace for seller orders, PayPal payment status, and AI-assisted payment investigations.",
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

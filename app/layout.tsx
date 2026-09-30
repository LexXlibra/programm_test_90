import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NynetyDegrees — Artist Portal", template: "%s · NynetyDegrees" },
  description: "Release management for NynetyDegrees artists and label team.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await headers();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

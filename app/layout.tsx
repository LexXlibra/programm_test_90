import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NynetyDegrees — Artist Portal", template: "%s · NynetyDegrees" },
  description: "Release management for NynetyDegrees artists and label team.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

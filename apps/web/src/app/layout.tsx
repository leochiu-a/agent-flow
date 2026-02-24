import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Flow",
  description: "Local AI workflow engine console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

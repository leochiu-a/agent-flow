import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Flow",
  description: "Local AI workflow engine console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "monospace",
          background: "#0f0f0f",
          color: "#e0e0e0",
        }}
      >
        {children}
      </body>
    </html>
  );
}

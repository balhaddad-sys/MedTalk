import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTalk - Healthcare Translation",
  description:
    "Bridge language barriers in clinical conversations. Real-time medical translation for patients and providers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

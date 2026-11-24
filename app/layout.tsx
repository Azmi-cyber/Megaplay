import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stream URL Extractor — Azmi Ganteng",
  description: "Analisis halaman streaming: sumber video, subtitle, dan kualitas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

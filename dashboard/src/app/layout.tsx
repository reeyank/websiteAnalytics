import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Website analytics and heatmap visualization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

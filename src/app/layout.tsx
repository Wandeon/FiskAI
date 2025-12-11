import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiskAI",
  description: "AI-powered e-invoicing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr">
      <body>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: "font-sans",
            duration: 4000,
          }}
        />
        <Suspense fallback={null}>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}

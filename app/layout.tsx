import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";
import { OptionsProvider } from "@/context/OptionsContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "PMS - Enterprise-grade Project Management System",
  description: "Enterprise-grade Project Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <OptionsProvider>
            <Layout>{children}</Layout>
            <Toaster position="top-right" />
          </OptionsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

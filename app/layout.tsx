import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";
import { OptionsProvider } from "@/context/OptionsContext";
import { AuthProvider } from "@/context/AuthContext";
import QueryProvider from "@/context/QueryProvider";
import { Toaster } from "react-hot-toast";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthProvider>
          <OptionsProvider>
            <QueryProvider>
              <Layout>
                {children}
              </Layout>
              <Toaster position="top-right" />
            </QueryProvider>
          </OptionsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

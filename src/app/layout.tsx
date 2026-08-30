import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getAccounts, getSettings } from "@/lib/data";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandProvider } from "@/components/brand-provider";
import { TradeFormProvider } from "@/components/journal/trade-form-context";
import { AppShell } from "@/components/app/app-shell";
import { AgentationTool } from "@/components/agentation";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Trade Journal",
    template: "%s · Trade Journal",
  },
  description:
    "A local-first trading journal — record trades quickly, review performance honestly.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <BrandProvider
          brandName={settings.brandName}
          brandTagline={settings.brandTagline}
        >
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <TradeFormProvider accounts={accounts}>
              <AppShell accounts={accounts}>{children}</AppShell>
              <Toaster position="bottom-right" />
              <AgentationTool />
            </TradeFormProvider>
          </ThemeProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
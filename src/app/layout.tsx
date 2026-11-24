import type { Metadata, Viewport } from "next";
import { Cairo, Plus_Jakarta_Sans } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/components/AuthProvider";
import { SitePreloader } from "@/components/SitePreloader";
import { APP_NAME, APP_TAGLINE_FR, STORAGE_KEY } from "@/lib/config";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE_FR}`,
  description:
    "Application simple et transparente de gestion de syndic de copropriété au Maroc : suivi des cotisations, reçus PDF WhatsApp, photos des factures et portail résidents sans application.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F6F4" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `try{var r=localStorage.getItem(${JSON.stringify(
    STORAGE_KEY
  )});if(r){var d=JSON.parse(r);var h=document.documentElement;if(d&&d.theme==="dark"){h.classList.add("dark");}if(d&&d.locale==="ar"){h.dir="rtl";h.lang="ar";}}}catch(e){}`;

  return (
    <html
      lang="fr"
      dir="ltr"
      suppressHydrationWarning
      className={`${jakarta.variable} ${cairo.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-[#F6F6F4] text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100 flex flex-col transition-colors">
        <AuthProvider>
          <AppProvider>
            <SitePreloader />
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

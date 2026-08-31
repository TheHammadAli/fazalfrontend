import type { Metadata } from "next";
import "./[lang]/globals.css";
import Providers from "./providers";
import { lato } from "./fonts";

const FAVICON_PNG = "/favicon.png?v=4";
const FAVICON_ICO = "/favicon.ico?v=4";

export const metadata: Metadata = {
  title: "Fazl",
  description:
    "Buy and sell products, open a shop, and book trusted local services near you.",
  icons: {
    icon: [
      { url: FAVICON_PNG, type: "image/png" },
      { url: FAVICON_ICO, type: "image/x-icon" },
    ],
    shortcut: FAVICON_ICO,
    apple: FAVICON_PNG,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={lato.className} lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="icon" href={FAVICON_PNG} type="image/png" />
        <link rel="shortcut icon" href={FAVICON_ICO} />
        <link rel="apple-touch-icon" href={FAVICON_PNG} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

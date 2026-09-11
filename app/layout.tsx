import type { Metadata } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/karla/400.css";
import "@fontsource/karla/500.css";
import "@fontsource/karla/600.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/encode-sans-semi-condensed/700.css";
import "./globals.css";

/**
 * Root layout: the document shell every route renders inside.
 *
 * The four typefaces are self-hosted through Fontsource rather than loaded from
 * a font CDN, so there is no third-party request on first paint and no layout
 * shift while a webfont arrives. Only the weights actually used are imported.
 */

export const metadata: Metadata = {
  // `template` appends the wordmark to every child page's own title, so a page
  // only has to declare its own name.
  title: {
    default: "Backathons at Herkeley",
    template: "%s · Backathons at Herkeley",
  },
  description: "Apply, review, form teams, and run event operations for Backathons at Herkeley.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

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

export const metadata: Metadata = {
  title: {
    default: "Run of Show · Hackathons @ Berkeley",
    template: "%s · Hackathons @ Berkeley",
  },
  description:
    "Apply, review, form teams, and run event operations for Hackathons @ Berkeley.",
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

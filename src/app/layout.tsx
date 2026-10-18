import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";
import "./access.css";

export const metadata: Metadata = {
  title: "Dropdesk — your dropshipping workspace",
  description: "Organize client workspaces, product research, marketplace listings, and dropshipping orders in one place.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}

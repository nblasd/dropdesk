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
  return <html lang="en" data-theme="midnight" data-tone="dark" style={{colorScheme:"dark"}} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{var d=document.documentElement,s=localStorage.getItem("dropdesk-theme"),t=["midnight","ocean","ember","orchid","daylight"].includes(s)?s:"midnight",m=t==="daylight"?"light":"dark";d.dataset.theme=t;d.dataset.tone=m;d.style.colorScheme=m}catch(e){}`}}/></head><body>{children}</body></html>;
}

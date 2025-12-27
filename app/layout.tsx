import type { Metadata } from "next";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "Agentic AI Bot",
  description: "Multi-step agentic AI assistant with tool usage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

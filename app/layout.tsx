import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fortune Cat",
  description: "Log expenses and income, see your balance, go Pro.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Klien",
  description: "Kelola data klien Faktura.",
  robots: { index: false, follow: false },
};

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

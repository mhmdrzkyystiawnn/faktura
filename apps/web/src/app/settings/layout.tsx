import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Kelola profil dan password akun Faktura Anda.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

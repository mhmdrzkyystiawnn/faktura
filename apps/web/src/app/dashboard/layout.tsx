import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Ringkasan invoice dan arus kas Faktura.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

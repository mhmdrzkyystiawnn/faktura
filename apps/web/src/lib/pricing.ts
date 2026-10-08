/**
 * Sumber tunggal untuk konfigurasi harga.
 *
 * CATATAN: harga Pro masih PLACEHOLDER — belum diputuskan secara product.
 * Ubah `proPriceMonthly` di satu tempat ini saat angkanya sudah final.
 */
export const pricing = {
  free: {
    name: "Free",
    priceMonthly: 0,
    priceLabel: "Gratis",
    tagline: "Cukup untuk freelancer yang baru mulai.",
    features: [
      "Maksimal 5 invoice aktif per bulan",
      "Invoice otomatis dengan nomor berurutan",
      "Kirim invoice lewat email",
      "Reminder otomatis (H-3, H-1, hari-H, setelah jatuh tempo)",
      "Dashboard piutang & invoice overdue",
      "Cetak / simpan invoice sebagai PDF",
    ],
    cta: { label: "Mulai Gratis", href: "/auth/register" },
  },
  pro: {
    name: "Pro",
    priceMonthly: null as number | null,
    priceLabel: "Segera hadir",
    tagline: "Untuk yang menagih lebih banyak setiap bulan.",
    features: [
      "Invoice tanpa batas",
      "Semua fitur plan Free",
      "Prioritas dukungan",
    ],
    cta: { label: "Gabung daftar tunggu", href: "/auth/register" },
  },
} as const;

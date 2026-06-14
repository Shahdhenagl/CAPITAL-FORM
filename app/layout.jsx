import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "عاصمة الكون للمصاعد - احجز زيارة وصيانة مجانية",
  description:
    "سجّل بياناتك واحصل على زيارة معاينة وصيانة مجانية من عاصمة الكون للمصاعد.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

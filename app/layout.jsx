import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "عاصمة الكون للمصاعد - احجز زيارة معاينة مجانية",
  description:
    "سجّل بياناتك واحصل على زيارة معاينة مجانية وخصومات على عقود الصيانة والتركيب تصل إلى 50% من عاصمة الكون للمصاعد.",
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

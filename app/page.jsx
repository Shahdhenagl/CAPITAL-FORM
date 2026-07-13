import LeadForm from "@/components/LeadForm";

export default function HomePage() {
  return (
    <div className="page">
      <header className="hero">
        <div className="logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="عاصمة الكون للمصاعد" />
        </div>
        <h1>عاصمة الكون للمصاعد</h1>
        <p>
          سجّل بياناتك الآن واحصل على <b>زيارة معاينة مجانية</b> و
          <b> خصومات على عقود الصيانة والتركيب تصل إلى 50%</b> من فريقنا
          المتخصص.
        </p>
        <div className="badge">
          🎁 معاينة مجانية + خصم يصل إلى 50% على عقود الصيانة والتركيب
        </div>
      </header>

      <main className="container">
        <LeadForm />
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} عاصمة الكون للمصاعد — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}

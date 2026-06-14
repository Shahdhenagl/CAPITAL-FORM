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
          سجّل بياناتك الآن واحصل على <b>زيارة معاينة وصيانة مجانية</b> من فريق
          الصيانة المتخصص لدينا.
        </p>
        <div className="badge">🎁 زيارة وصيانة مجانية عند التسجيل</div>
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

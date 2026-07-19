import LeadForm from "@/components/LeadForm";

export default function HomePage() {
  return (
    <div className="page">
      <header className="hero">
        <div className="logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="عاصمة الكون للمصاعد" />
        </div>
        <h1>عاصمة الكون للمصاعد</h1>

        <div className="badge">
          🎁 سجل و تابع عاصمه الكون و ارتقي بمصعدك
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

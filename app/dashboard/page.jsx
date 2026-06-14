import { getSupabase } from "@/lib/supabase";
import LeadCard from "@/components/LeadCard";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

async function getLeads() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return { leads: [], err: error.message };
    }
    return { leads: data || [], err: null };
  } catch (e) {
    return { leads: [], err: e.message };
  }
}

export default async function DashboardPage() {
  const { leads, err } = await getLeads();

  const total = leads.length;
  const fresh = leads.filter((l) => l.status === "new").length;
  const scheduled = leads.filter((l) => l.status === "scheduled").length;
  const done = leads.filter((l) => l.status === "done").length;

  return (
    <div className="dash">
      <div className="dash-head">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="logo" />
          طلبات الزيارة - عاصمة الكون للمصاعد
        </h1>
        <LogoutButton />
      </div>

      {err && (
        <div className="alert">
          خطأ في قراءة قاعدة البيانات: {err}. تأكد من ضبط متغيرات Supabase وتشغيل
          ملف الـ SQL.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="n">{total}</div>
          <div className="l">إجمالي الطلبات</div>
        </div>
        <div className="stat">
          <div className="n">{fresh}</div>
          <div className="l">طلبات جديدة</div>
        </div>
        <div className="stat">
          <div className="n">{scheduled}</div>
          <div className="l">مواعيد محددة</div>
        </div>
        <div className="stat">
          <div className="n">{done}</div>
          <div className="l">زيارات تمت</div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="empty">لا توجد طلبات بعد.</div>
      ) : (
        leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
      )}
    </div>
  );
}

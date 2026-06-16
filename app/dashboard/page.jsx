import { unstable_noStore as noStore } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import LeadsDashboard from "@/components/LeadsDashboard";
import LogoutButton from "@/components/LogoutButton";
import NewLeadNotifier from "@/components/NewLeadNotifier";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getLeads() {
  noStore(); // never cache leads — always read the latest from the DB
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

  return (
    <div className="dash">
      <div className="dash-head">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="logo" />
          طلبات الزيارة - عاصمة الكون للمصاعد
        </h1>
        <div className="dash-head-actions">
          <NewLeadNotifier initialCount={leads.length} />
          <LogoutButton />
        </div>
      </div>

      {err && (
        <div className="alert">
          خطأ في قراءة قاعدة البيانات: {err}. تأكد من ضبط متغيرات Supabase وتشغيل
          ملف الـ SQL.
        </div>
      )}

      {leads.length === 0 ? (
        <div className="empty">لا توجد طلبات بعد.</div>
      ) : (
        <LeadsDashboard leads={leads} />
      )}
    </div>
  );
}

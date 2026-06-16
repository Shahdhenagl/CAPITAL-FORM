-- شغّل هذا الملف مرة واحدة في Supabase:
-- Dashboard > SQL Editor > New query > الصق المحتوى > Run

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  whatsapp text,
  facility_type text,
  address text,
  notes text,
  lat double precision,
  lng double precision,
  maps_link text,
  status text not null default 'new',
  appointment_at timestamptz,
  team_note text
);

-- لو الجدول موجود من قبل، شغّل السطر ده لإضافة عمود ملاحظة الفريق:
alter table public.leads add column if not exists team_note text;

-- عمود لتتبّع إرسال التذكير التلقائي (يمنع تكرار الإرسال من الـ Cron):
alter table public.leads add column if not exists reminder_sent_at timestamptz;

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- نُفعّل RLS ونمنع أي وصول عام؛ التطبيق يستخدم مفتاح service_role
-- (الذي يتجاوز RLS) من جهة الخادم فقط، فلا حاجة لأي policy عامة.
alter table public.leads enable row level security;

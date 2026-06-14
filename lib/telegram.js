// Sends a notification message to the configured Telegram chat.
// Fails silently (logs only) so a Telegram outage never blocks a submission.
export async function notifyTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram not configured; skipping notification.");
    return;
  }

  const facilityLabels = {
    hotel: "فندق",
    company: "شركة",
    building: "عمارة",
    other: "أخرى",
  };

  const lines = [
    "🔔 *طلب زيارة جديد - عاصمة الكون للمصاعد*",
    "",
    `👤 الاسم: ${lead.name}`,
    `📞 الجوال: ${lead.phone}`,
    lead.whatsapp ? `🟢 واتساب: ${lead.whatsapp}` : null,
    `🏢 نوع المنشأة: ${facilityLabels[lead.facility_type] || lead.facility_type || "-"}`,
    lead.address ? `📍 العنوان: ${lead.address}` : null,
    lead.maps_link ? `🗺️ الموقع على الخريطة: ${lead.maps_link}` : null,
    lead.notes ? `📝 ملاحظات: ${lead.notes}` : null,
  ].filter(Boolean);

  const text = lines.join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        }),
      }
    );
    if (!res.ok) {
      console.error("Telegram error:", await res.text());
    }
  } catch (err) {
    console.error("Telegram request failed:", err);
  }
}

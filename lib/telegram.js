// Sends a notification message to the configured Telegram chat.
// Fails silently (logs only) so a Telegram outage never blocks a submission.
export async function notifyTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // Supports multiple recipients: comma-separated chat IDs in TELEGRAM_CHAT_ID.
  const chatIds = (process.env.TELEGRAM_CHAT_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
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
    lead.employee_name ? `👨‍💼 موظف التسويق: ${lead.employee_name}` : null,
    `👤 الاسم: ${lead.name}`,
    `📞 الجوال: ${lead.phone}`,
    lead.whatsapp ? `🟢 واتساب: ${lead.whatsapp}` : null,
    `🏢 نوع المنشأة: ${facilityLabels[lead.facility_type] || lead.facility_type || "-"}`,
    lead.address ? `📍 العنوان: ${lead.address}` : null,
    lead.maps_link ? `🗺️ الموقع على الخريطة: ${lead.maps_link}` : null,
    lead.notes ? `📝 تفاصيل الطلب: \n${lead.notes}` : null,
  ].filter(Boolean);

  const text = lines.join("\n");

  // Send to every configured recipient; one failure shouldn't block the rest.
  await Promise.all(
    chatIds.map(async (chatId) => {
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
          console.error(`Telegram error (chat ${chatId}):`, await res.text());
        }
      } catch (err) {
        console.error(`Telegram request failed (chat ${chatId}):`, err);
      }
    })
  );
}

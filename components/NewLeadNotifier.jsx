"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 15000;
const STORAGE_KEY = "cf_notify_enabled";

export default function NewLeadNotifier({ initialCount = 0 }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const lastCount = useRef(initialCount);
  const audioCtx = useRef(null);

  // Plays a short two-tone beep using the Web Audio API (no asset file needed).
  const playBeep = useCallback(() => {
    try {
      if (!audioCtx.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx.current = new Ctx();
      }
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    } catch {
      // Audio not available — ignore.
    }
  }, []);

  const notify = useCallback(
    (added) => {
      playBeep();
      const title = "🔔 طلب زيارة جديد";
      const body =
        added > 1 ? `وصل ${added} طلبات جديدة` : "وصل طلب زيارة جديد على الداش بورد";
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/logo.svg" });
        }
      } catch {
        // Ignore notification errors.
      }
    },
    [playBeep]
  );

  // Enables notifications: requests browser permission and unlocks audio
  // (browsers block sound until a user gesture).
  const enable = useCallback(async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !audioCtx.current) audioCtx.current = new Ctx();
      if (audioCtx.current?.state === "suspended") await audioCtx.current.resume();
    } catch {
      // Ignore.
    }
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      // Ignore.
    }
    setEnabled(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore.
    }
    playBeep(); // confirmation beep so the user knows sound works
  }, [playBeep]);

  const disable = useCallback(() => {
    setEnabled(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }, []);

  // Restore preference on mount.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setEnabled(true);
    } catch {
      // Ignore.
    }
  }, []);

  // Poll for new leads while enabled.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    async function check() {
      try {
        const res = await fetch("/api/leads/count", { cache: "no-store" });
        if (!res.ok) return;
        const { count } = await res.json();
        if (!alive || typeof count !== "number") return;
        if (count > lastCount.current) {
          const added = count - lastCount.current;
          lastCount.current = count;
          notify(added);
          router.refresh(); // pull the new lead(s) into the list
        } else if (count < lastCount.current) {
          lastCount.current = count; // a lead was deleted — resync silently
        }
      } catch {
        // Network hiccup — try again next tick.
      }
    }

    const id = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled, notify, router]);

  return (
    <button
      type="button"
      className={`btn sm ${enabled ? "green" : "ghost"}`}
      onClick={enabled ? disable : enable}
      title={enabled ? "إيقاف إشعارات الطلبات الجديدة" : "تفعيل إشعار وصوت عند وصول طلب جديد"}
    >
      {enabled ? "🔔 الإشعارات مفعّلة" : "🔕 تفعيل الإشعارات"}
    </button>
  );
}

import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { sendPushToUsers } from "../_shared/push.ts";

const supabase = createSupabaseAdmin();

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // === LECTURE REMINDERS ===
  const lectureWindows = [
    {
      label: "30min",
      min: 28,
      max: 32,
      title: (c: string) => `${c} starts in 30 minutes`,
      includeLink: false,
    },
    {
      label: "15min",
      min: 13,
      max: 17,
      title: (c: string) => `${c} starts in 15 minutes`,
      includeLink: false,
    },
    {
      label: "5min",
      min: 3,
      max: 7,
      title: (c: string) => `${c} is about to start`,
      includeLink: true,
    },
  ];

  for (const w of lectureWindows) {
    const windowStart = new Date(now.getTime() + w.min * 60000).toISOString();
    const windowEnd = new Date(now.getTime() + w.max * 60000).toISOString();

    const { data: lectures } = await supabase
      .from("lectures")
      .select("*")
      .eq("status", "scheduled")
      .gte("start_time", windowStart)
      .lte("start_time", windowEnd);

    for (const lecture of lectures || []) {
      if (lecture.notifications_sent?.[w.label]) continue;

      await sendToEnrolledStudents(lecture, {
        title: w.title(lecture.course_code),
        body: `Facilitator: ${lecture.facilitator_name}${w.includeLink ? " · Tap to join" : ""}`,
        lectureId: lecture.id,
        meetingWebUrl: w.includeLink ? lecture.meeting_web_url : null,
        minutesBefore: parseInt(w.label),
      });

      await supabase
        .from("lectures")
        .update({
          notifications_sent: {
            ...(lecture.notifications_sent || {}),
            [w.label]: true,
          },
        })
        .eq("id", lecture.id);
    }
  }

  // === TMA DEADLINE REMINDERS ===
  const tmaWindows = [
    { label: "24h", min: 23 * 60, max: 25 * 60, suffix: "due tomorrow" },
    { label: "1h", min: 55, max: 65, suffix: "due in 1 hour" },
  ];

  for (const w of tmaWindows) {
    const windowStart = new Date(now.getTime() + w.min * 60000).toISOString();
    const windowEnd = new Date(now.getTime() + w.max * 60000).toISOString();

    const { data: tmas } = await supabase
      .from("tma_deadlines")
      .select("*")
      .gte("due_date", windowStart)
      .lte("due_date", windowEnd);

    for (const tma of tmas || []) {
      if (tma.reminders_sent?.[w.label]) continue;
      // TMA deadlines are semester-wide — notify all enrolled students regardless of course
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("academic_session", tma.academic_session)
        .eq("expired", false);

      const userIds = [...new Set((enrollments || []).map((e: any) => e.user_id))];
      if (userIds.length === 0) continue;

      // In-app notification bell/panel — TMA deadlines are semester-wide, no single course_code
      await supabase.from("notifications").insert(
        userIds.map((user_id) => ({
          user_id,
          lecture_id: null,
          course_code: "TMA",
          message: `TMA ${tma.tma_number} ${w.suffix} — Submit on NOUN eLearn portal`,
          type: "tma_deadline",
          sent_at: new Date().toISOString(),
        })),
      );

      const { data: users } = await supabase
        .from("users")
        .select("push_subscriptions, notification_preferences")
        .in("id", userIds);

      await sendPushToUsers(
        supabase,
        users || [],
        {
          title: `TMA ${tma.tma_number} ${w.suffix}`,
          body: `Submit on NOUN eLearn portal`,
        },
        (user) => !!user.notification_preferences?.tma,
      );

      await supabase
        .from("tma_deadlines")
        .update({
          reminders_sent: { ...(tma.reminders_sent || {}), [w.label]: true },
        })
        .eq("id", tma.id);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function sendToEnrolledStudents(lecture: any, payload: any) {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id")
    .eq("course_id", lecture.course_id)
    .eq("expired", false);

  const userIds = (enrollments || []).map((e: any) => e.user_id);
  if (userIds.length === 0) return;

  // In-app notification bell/panel — independent of push subscription state
  await supabase.from("notifications").insert(
    userIds.map((user_id: string) => ({
      user_id,
      lecture_id: payload.lectureId,
      course_code: lecture.course_code,
      message: payload.body,
      type: "reminder",
      minutes_before: payload.minutesBefore ?? null,
      sent_at: new Date().toISOString(),
      meeting_link: payload.meetingWebUrl || null,
    })),
  );

  const { data: users } = await supabase
    .from("users")
    .select("id, push_subscriptions, notification_preferences")
    .in("id", userIds);

  await sendPushToUsers(
    supabase,
    users || [],
    payload,
    (user) => user.notification_preferences?.reminders !== false,
  );
}

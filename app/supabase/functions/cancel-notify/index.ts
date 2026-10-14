import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { sendPushToUsers } from "../_shared/push.ts";

const supabase = createSupabaseAdmin();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (req.headers.get("x-internal-secret") !== Deno.env.get("CANCEL_NOTIFY_SECRET")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const { lectureId, type } = await req.json().catch(() => ({}) as any);
  if (!lectureId || !type) {
    return new Response("Missing lectureId or type", { status: 400, headers: corsHeaders });
  }

  const { data: lecture } = await supabase
    .from("lectures")
    .select("*")
    .eq("id", lectureId)
    .single();

  if (!lecture) {
    return new Response("Lecture not found", { status: 404, headers: corsHeaders });
  }

  const timeStr = new Date(lecture.start_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  let payload: Record<string, unknown>;
  switch (type) {
    case "cancelled":
      payload = {
        title: `${lecture.course_code} cancelled`,
        body: `${timeStr} session cancelled${lecture.cancel_reason ? ` — ${lecture.cancel_reason}` : ""}`,
        lectureId,
      };
      break;
    case "rescheduled":
      payload = {
        title: `${lecture.course_code} rescheduled`,
        body: `New time: ${timeStr} — ${lecture.facilitator_name}`,
        lectureId,
      };
      break;
    case "recording_added":
      payload = {
        title: `Recording available: ${lecture.course_code}`,
        body: `The recording for your session is now available`,
        lectureId,
      };
      break;
    case "announcement":
      payload = {
        title: `${lecture.course_code} update`,
        body: lecture.announcement || "New announcement from your facilitator",
        lectureId,
      };
      break;
    default:
      return new Response("Unknown type", { status: 400, headers: corsHeaders });
  }

  // Send to enrolled students
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id")
    .eq("course_id", lecture.course_id)
    .eq("expired", false);

  const userIds = (enrollments || []).map((e: any) => e.user_id);

  if (userIds.length > 0) {
    // In-app notification bell/panel — independent of push subscription state
    const notificationTypeMap: Record<string, string> = {
      cancelled: "cancellation",
      rescheduled: "reschedule",
      recording_added: "recording_added",
      announcement: "announcement",
    };
    await supabase.from("notifications").insert(
      userIds.map((user_id: string) => ({
        user_id,
        lecture_id: lectureId,
        course_code: lecture.course_code,
        message: payload.body,
        type: notificationTypeMap[type] || type,
        sent_at: new Date().toISOString(),
        meeting_link: lecture.meeting_web_url || null,
      })),
    );

    const { data: users } = await supabase
      .from("users")
      .select("id, push_subscriptions, notification_preferences")
      .in("id", userIds);

    await sendPushToUsers(supabase, users || [], payload);
  }

  return new Response(JSON.stringify({ ok: true, sent: userIds.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import webpush from "npm:web-push@3.6.7";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    "mailto:admin@noun.edu.ng",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  vapidConfigured = true;
}

export async function removeSubscription(
  supabase: any,
  user: any,
  sub: any,
) {
  const remaining = (user.push_subscriptions || []).filter(
    (s: any) => s.endpoint !== sub.endpoint,
  );
  await supabase
    .from("users")
    .update({ push_subscriptions: remaining })
    .eq("id", user.id);
}

// Sends `payload` to every push subscription for each user, honoring the
// global notification_preferences.enabled toggle plus an optional per-type
// filter (e.g. reminders / tma). Prunes subscriptions that come back 410 Gone.
export async function sendPushToUsers(
  supabase: any,
  users: any[],
  payload: Record<string, unknown>,
  filter?: (user: any) => boolean,
) {
  ensureVapidConfigured();
  for (const user of users || []) {
    if (!user.notification_preferences?.enabled) continue;
    if (filter && !filter(user)) continue;
    for (const sub of user.push_subscriptions || []) {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410) await removeSubscription(supabase, user, sub);
      }
    }
  }
}

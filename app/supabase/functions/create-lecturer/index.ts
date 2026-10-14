import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

const supabase = createSupabaseAdmin();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.headers.get("x-internal-secret") !== Deno.env.get("CANCEL_NOTIFY_SECRET")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { email, full_name, faculty, department, courses = [] } = body;
  if (!email || !full_name) {
    return new Response(
      JSON.stringify({ error: "email and full_name are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create auth user — trigger creates the public.users row automatically
  let userId: string;
  let reactivated = false;

  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password: "12345",
    email_confirm: true,
    user_metadata: {
      full_name: full_name.trim(),
      role: "lecturer",
      faculty: (faculty || "").trim(),
      department: (department || "").trim(),
    },
  });

  if (error) {
    if (!error.message.includes("already been registered")) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Email already exists in Auth (e.g. admin deleted from public.users but not from Auth).
    // Find the existing auth user, re-create their public.users profile, and continue.
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) {
      return new Response(
        JSON.stringify({ error: "Email already registered and lookup failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const existing = listData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Email already registered but cannot be located" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    userId = existing.id;
    reactivated = true;

    // Upsert the public.users profile row (may have been deleted from Supabase panel)
    await supabase.from("users").upsert(
      {
        id: userId,
        email: email.trim(),
        full_name: full_name.trim(),
        faculty: (faculty || "").trim(),
        department: (department || "").trim(),
        role: "lecturer",
        status: "pending",
        onboarding_complete: true,
      },
      { onConflict: "id" },
    );
  } else {
    userId = data.user.id;
  }

  let activated = false;

  // If course codes were provided, resolve them and assign — then auto-approve
  if (courses.length > 0) {
    try {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "active_academic_session")
        .single();

      const activeSession = settings?.value;

      if (activeSession) {
        const { data: courseRows } = await supabase
          .from("courses")
          .select("id, course_code")
          .in("course_code", courses);

        if (courseRows && courseRows.length > 0) {
          await supabase.from("lecturer_courses").upsert(
            courseRows.map((c: any) => ({
              lecturer_id: userId,
              course_id: c.id,
              academic_session: activeSession,
            })),
            { onConflict: "lecturer_id,course_id,academic_session" },
          );
        }
      }

      // Admin explicitly assigned courses in the CSV — activate immediately
      await supabase.from("users").update({ status: "active" }).eq("id", userId);
      activated = true;
    } catch (assignErr: any) {
      // User was created successfully — course assignment failed, stays pending
      console.error("Course assignment failed:", assignErr.message);
    }
  }

  return new Response(
    JSON.stringify({ id: userId, activated, reactivated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

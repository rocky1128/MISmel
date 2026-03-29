import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  const { data, error } = await supabase
    .from("activity_schedule")
    .select("activity_id, month, year")
    .eq("month", month)
    .eq("year", year)
    .eq("is_planned", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const activityIds = (data ?? []).map((row) => row.activity_id);

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, title, owner_id")
    .in("id", activityIds);

  if (activitiesError) {
    return new Response(JSON.stringify({ error: activitiesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const ownerIds = (activities ?? [])
    .map((activity) => activity.owner_id)
    .filter(Boolean);

  const { data: owners, error: ownersError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ownerIds);

  if (ownersError) {
    return new Response(JSON.stringify({ error: ownersError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const activityById = new Map((activities ?? []).map((activity) => [activity.id, activity]));
  const ownerById = new Map((owners ?? []).map((owner) => [owner.id, owner]));

  const reminders = (data ?? []).map((row) => {
    const activity = activityById.get(row.activity_id);
    const owner = ownerById.get(activity?.owner_id);

    return {
      activityId: row.activity_id,
      activityTitle: activity?.title,
      ownerName: owner?.full_name ?? "Assigned owner",
      ownerEmail: owner?.email ?? null,
      reminderMonth: month,
      reminderYear: year
    };
  });

  return new Response(
    JSON.stringify({
      message: "Reminder batch prepared",
      count: reminders.length,
      reminders
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

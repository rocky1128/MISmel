import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ActivitySnapshot {
  id: string;
  objective_id: string;
  weight: number;
}

interface CheckinSnapshot {
  activity_id: string;
  percent_complete: number;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => ({}));
  const reportingPeriodId = body.reportingPeriodId as string | undefined;

  if (!reportingPeriodId) {
    return new Response(
      JSON.stringify({ error: "reportingPeriodId is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: activities, error: activityError } = await supabase
    .from("activities")
    .select("id, objective_id, weight");

  if (activityError) {
    return new Response(JSON.stringify({ error: activityError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: checkins, error: checkinError } = await supabase
    .from("monthly_checkins")
    .select("activity_id, percent_complete");

  if (checkinError) {
    return new Response(JSON.stringify({ error: checkinError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const completionByActivity = new Map<string, number>();

  for (const checkin of (checkins ?? []) as CheckinSnapshot[]) {
    const current = completionByActivity.get(checkin.activity_id) ?? 0;
    completionByActivity.set(
      checkin.activity_id,
      Math.max(current, Number(checkin.percent_complete))
    );
  }

  const snapshots = ((activities ?? []) as ActivitySnapshot[]).map((activity) => {
    const score = completionByActivity.get(activity.id) ?? 0;
    const weightedScore = Number(((score * activity.weight) / 100).toFixed(2));

    return {
      reporting_period_id: reportingPeriodId,
      activity_id: activity.id,
      objective_id: activity.objective_id,
      score,
      weighted_score: weightedScore
    };
  });

  const { error: snapshotError } = await supabase
    .from("score_snapshots")
    .delete()
    .eq("reporting_period_id", reportingPeriodId);

  if (snapshotError) {
    return new Response(JSON.stringify({ error: snapshotError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { error: insertError } = await supabase
    .from("score_snapshots")
    .insert(snapshots);

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(
    JSON.stringify({
      message: "Score snapshots calculated successfully",
      count: snapshots.length
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});


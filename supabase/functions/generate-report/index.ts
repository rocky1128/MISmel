import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

  const [{ data: period }, { data: scores }, { data: evidence }, { data: indicatorValues }] =
    await Promise.all([
      supabase.from("reporting_periods").select("*").eq("id", reportingPeriodId).single(),
      supabase.from("score_snapshots").select("*").eq("reporting_period_id", reportingPeriodId),
      supabase.from("evidence_items").select("*").eq("reporting_period_id", reportingPeriodId),
      supabase.from("indicator_values").select("*").eq("reporting_period_id", reportingPeriodId)
    ]);

  const indicatorIds = (indicatorValues ?? []).map((row) => row.indicator_id);
  const { data: indicators } = indicatorIds.length
    ? await supabase.from("indicators").select("id, code, name").in("id", indicatorIds)
    : { data: [] };

  const indicatorById = new Map((indicators ?? []).map((indicator) => [indicator.id, indicator]));

  const indicatorReport = (indicatorValues ?? []).map((value) => ({
    actualValue: value.actual_value,
    comment: value.comment,
    indicator: indicatorById.get(value.indicator_id) ?? null
  }));

  const report = {
    reportingPeriod: period,
    summary: {
      scoreCount: scores?.length ?? 0,
      evidenceCount: evidence?.length ?? 0,
      indicatorCount: indicatorReport.length
    },
    scores,
    evidence,
    indicators: indicatorReport,
    generatedAt: new Date().toISOString()
  };

  return new Response(JSON.stringify(report), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});

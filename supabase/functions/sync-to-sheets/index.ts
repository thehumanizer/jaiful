// ============================================================
// JAIFUL — Supabase Edge Function: Sync to Google Sheets
// Triggered by Supabase Database Webhook on registrations table
// ============================================================

const SUPABASE_URL     = "https://wtrhcyspnkgtvaxtcsax.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cmhjeXNwbmtndHZheHRjc2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ3MjcsImV4cCI6MjA4ODU0MDcyN30.ywq13EeFWvZ47D_qgAnFmSPRXhAKR1kf9cBs2YpL5WQ";

// Fetch full registration + member data from Supabase
async function fetchFullData(regId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/registrations?reg_id=eq.${regId}&select=*,members(*)`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  const rows = await res.json();
  if (!rows || rows.length === 0) return null;
  const { members, ...reg } = rows[0];
  return { registration: reg, member: members };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Supabase webhook payload: { type: "INSERT"|"UPDATE", table, record, old_record }
    const record = body.record ?? body;
    const regId  = record?.reg_id;
    if (!regId) {
      return new Response(JSON.stringify({ error: "no reg_id" }), { status: 400 });
    }

    const data = await fetchFullData(regId);
    if (!data) {
      return new Response(JSON.stringify({ error: "record not found" }), { status: 404 });
    }

    const appsScriptUrl = Deno.env.get("APPS_SCRIPT_URL");
    const syncSecret    = Deno.env.get("SYNC_SECRET");
    if (!appsScriptUrl) {
      return new Response(JSON.stringify({ error: "APPS_SCRIPT_URL not set" }), { status: 500 });
    }

    // Send to Google Apps Script Web App
    const sheetRes = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: syncSecret,
        registration: data.registration,
        member: data.member,
      }),
    });

    const result = await sheetRes.json();
    return new Response(JSON.stringify({ ok: true, sheet: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

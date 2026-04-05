// ============================================================
// JAIFUL — Supabase Edge Function: Sync to Google Sheets
// Triggered by DB trigger on registrations table (INSERT/UPDATE)
// Payload includes full registration + member data from trigger
// ============================================================

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Trigger sends: { type, registration, member }
    const registration = body.registration ?? body.record;
    const member       = body.member;

    if (!registration?.reg_id) {
      return new Response(JSON.stringify({ error: "no reg_id in payload" }), { status: 400 });
    }

    const appsScriptUrl = Deno.env.get("APPS_SCRIPT_URL");
    const syncSecret    = Deno.env.get("SYNC_SECRET");

    if (!appsScriptUrl) {
      return new Response(JSON.stringify({ error: "APPS_SCRIPT_URL not set" }), { status: 500 });
    }

    const sheetRes = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: syncSecret,
        registration,
        member,
      }),
    });

    const result = await sheetRes.json().catch(() => ({ raw: sheetRes.status }));
    return new Response(JSON.stringify({ ok: true, sheet: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

import Anthropic from "npm:@anthropic-ai/sdk@0.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://jaiful.web.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SYSTEM_PROMPT = `คุณคือ Claude — AI assistant ที่โผล่มาบนเว็บ JAIFUL เพื่อให้คนได้ลองคุยและสัมผัส Claude จริงๆ

บทบาทของคุณ:
- ตอบเป็นภาษาไทยเสมอ สั้นๆ กระชับ อ่านง่าย ไม่เกิน 4-5 ประโยค
- แสดงให้เห็นว่า Claude ใช้ได้จริงในชีวิตประจำวัน — เป็นมิตร อบอุ่น ไม่ซีเรียส
- ถ้าคำถามเกี่ยวกับงาน ให้ตอบโดยมี insight จริงๆ ไม่ใช่แค่ generic
- ห้ามพูดถึง workshop JAIFUL หรือ Claude 123 เด็ดขาด — ให้เว็บ handle เอง
- ถ้ามีคนถามว่า "ทำแบบนี้เองได้ไหม" หรือ "สอนได้ไหม" ให้ตอบว่าได้ แต่ไม่ต้องชวนสมัคร

ห้าม: พูดยาว, พูดวิชาการ, ใช้ bullet point เยอะ, mention JAIFUL/workshop เอง`;

// Rate limit: max 20 requests per IP per hour (stored in memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (limit.count >= 20) return false;
  limit.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "too_many_requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.length > 500) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

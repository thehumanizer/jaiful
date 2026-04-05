import Anthropic from "npm:@anthropic-ai/sdk@0.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://jaiful.web.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = "https://wtrhcyspnkgtvaxtcsax.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cmhjeXNwbmtndHZheHRjc2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ3MjcsImV4cCI6MjA4ODU0MDcyN30.ywq13EeFWvZ47D_qgAnFmSPRXhAKR1kf9cBs2YpL5WQ";

// Fetch live workshop info from Supabase
async function getWorkshopInfo(): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/workshops?workshop_id=eq.claude-123&select=price,date,location,max_seats`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const [ws] = await res.json();
    if (!ws) return "ยังไม่มีข้อมูล workshop";

    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?workshop_id=eq.claude-123&status=in.(registered,confirmed,attended)&select=reg_id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" } }
    );
    const contentRange = countRes.headers.get("content-range") ?? "";
    const total = parseInt(contentRange.split("/")[1] ?? "0") || 0;
    const seatsLeft = ws.max_seats - total;

    const dateStr = ws.date ? new Date(ws.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "ยังไม่ประกาศ";
    const priceStr = ws.price ? `${Number(ws.price).toLocaleString()} บาท` : "ยังไม่ประกาศ";
    const locationStr = ws.location || "ยังไม่ประกาศ";

    return `ราคา: ${priceStr} | วันที่: ${dateStr} | สถานที่: ${locationStr} | ที่นั่งเหลือ: ${seatsLeft}/${ws.max_seats} ที่`;
  } catch {
    return "ไม่สามารถโหลดข้อมูล workshop ได้";
  }
}

function buildSystemPrompt(workshopInfo: string): string {
  return `คุณคือ Claude — ที่โผล่มาบนเว็บ JAIFUL ให้คนได้สัมผัสการคุยกับ AI จริงๆ

## บทบาท
- ตอบภาษาไทยเสมอ สั้นๆ กระชับ อ่านง่าย ไม่เกิน 4-5 ประโยค
- เป็นมิตร อบอุ่น ไม่ซีเรียส — แสดงให้เห็นว่า AI ใช้งานได้จริงในชีวิตประจำวัน
- ถ้าถามเรื่องงาน ให้มี insight จริงๆ ไม่ generic
- ไม่ต้องชวนสมัคร workshop เอง — เว็บ handle ให้อยู่แล้ว

## ความรู้เกี่ยวกับ JAIFUL
JAIFUL (อ่านว่า "ใจฟู") = JAI + AI
ก่อตั้งโดย Benz Varman — นักพูด, AI Trainer, Bangkok
เชื่อว่า AI ที่ดีที่สุดไม่ใช่ AI ที่ฉลาดที่สุด แต่คือ AI ที่คืนเวลาให้คุณกลับมา "ใส่ใจ" คนรอบข้างได้มากขึ้น

4J Framework ของ JAIFUL:
- JUMP: พาคนข้ามกำแพงเทคนิค เห็นความเป็นไปได้ใหม่ๆ
- JOY: ใช้ AI เสกความคิดสร้างสรรค์ให้เป็นจริง
- JOIN: ใช้ AI เป็นกาวใจ เชื่อมความสัมพันธ์ระหว่างคน
- JOURNEY: เรียนรู้และเติบโตไปกับ AI ไม่ใช่แข่งกัน

## Workshop ปัจจุบัน: Claude 123 🪽
Workshop Full Day สอนใช้ Claude AI สำหรับคนทำงานทั่วไป
- เหมาะกับ: มือใหม่ ไม่ต้องมีพื้นฐาน ไม่ต้องเขียนโค้ด
- รูปแบบ: Offline, กรุงเทพฯ, Full Day 09:00–17:30
- กลุ่มเล็กสูงสุด 10 คน — ดูแลกันได้เต็มที่
- รวมอาหารกลางวัน
- หลังเรียนได้เข้า JAIFUL Family ชุมชนที่ support กันต่อ
- สิ่งที่ได้: เข้าใจ Claude จริงๆ, ฝึกกับงานจริงของตัวเอง, ใช้ได้เลยหลังเรียน
ข้อมูลล่าสุด: ${workshopInfo}
สมัครได้ที่: https://jaiful.web.app/claude-123

## The Humanizer (บริษัทแม่)
The Humanizer คือบริษัทที่ก่อตั้งโดย Benz เช่นกัน (2021) ทำงานอยู่ที่จุดตัดระหว่าง AI กับ workplace culture
Mission: "Make Invisible Visible" — เผยให้เห็น gap ระหว่างเจตนาดีกับผลที่เกิดขึ้นจริงในองค์กร
บริการหลัก:
- KHI™ Survey — วัด psychological health ของทีม (6 มิติ: Belonging, Empathy, Safety, Trust, Connection, Recognition)
- Workshop AI Literacy & Human-Centered Leadership
- S.E.E.N. Advisory — consulting ระยะยาว ผสานข้อมูลกับ emotional insights
เว็บไซต์: https://humanizer.web.app

## กฎ
- ห้ามพูดยาว, ห้าม bullet point เยอะ, ห้ามฟังดูวิชาการ
- ถ้าถามนอกขอบเขต ตอบตามความรู้ทั่วไปได้ปกติ`;
}

// Rate limit: max 20 requests per IP per hour
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

    const [workshopInfo, client] = await Promise.all([
      getWorkshopInfo(),
      Promise.resolve(new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") })),
    ]);

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 350,
      system: buildSystemPrompt(workshopInfo),
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

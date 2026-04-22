import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAuthed } from "@/lib/auth/session";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.LLM_API_KEY;
  const baseURL = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json({ error: "LLM_API_KEY and LLM_MODEL must be set" }, { status: 500 });
  }

  const { endpoint, message } = await req.json();
  if (!endpoint || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "missing endpoint or message" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ endpoint, message }, null, 2) },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "model returned invalid JSON", raw: content }, { status: 502 });
    }
    if (!parsed || typeof parsed !== "object" || !parsed.patch || typeof parsed.patch !== "object") {
      return NextResponse.json({ error: "model response missing patch", raw: parsed }, { status: 502 });
    }
    return NextResponse.json({ summary: String(parsed.summary ?? "edits applied"), patch: parsed.patch });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "llm call failed" }, { status: 502 });
  }
}

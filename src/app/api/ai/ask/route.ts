import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AI_TOOLS, runAiTool } from "@/lib/ai/tools";
import { isTimeZone, localDate } from "@/lib/attendance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { serverError } from "@/lib/security/request";
import { getCountryConfig } from "@/lib/vat/countries";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_TURNS = 6;
const MAX_HISTORY = 20;
const MAX_CHARS = 2000;

type ChatTurn = { role: "user" | "assistant"; content: string };

function parseHistory(body: unknown): ChatTurn[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || !raw.length) return null;
  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    const role = (m as ChatTurn)?.role;
    const content = (m as ChatTurn)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (text) turns.push({ role, content: text });
  }
  // The API expects the conversation to start with the user and end with a question
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return null;
  return turns;
}

function systemPrompt(org: { name: string; country: string; currency: string }, today: string, timeZone: string) {
  const cfg = getCountryConfig(org.country);
  return `You are Ask KYRO, the assistant inside KYRO, a billing, stock and staff app. You are talking to someone who runs or works at "${org.name}".

Business facts:
- Country: ${cfg.name}. Currency: ${org.currency}. Sales tax is called ${cfg.taxSystem === "none" ? "nothing - this country has no VAT" : cfg.taxName}.
- Today is ${today} (time zone ${timeZone}). Resolve "today", "this week" (Monday to today), "this month", "last month" from this date.

How to answer:
- Use the tools to get real numbers. Never guess or invent figures, names or dates. If the tools return nothing, say so plainly.
- Keep answers short and practical: lead with the answer, then at most a few bullet points. Show money with the currency code, e.g. ${org.currency} 1,250.00.
- Write in plain words for a shop owner, not an accountant. Reply in the same language the person writes in.
- You can only read data. If asked to create, change, send or delete something, say where in KYRO to do it (Invoices, POS, Products, Customers, Purchases, Staff, Attendance, Reports, Settings).
- For tax filing or legal questions, give the numbers and suggest confirming with their accountant.
- Do not use tables or headings; use short paragraphs and "- " bullets, with **bold** for key numbers.`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Ask KYRO is not switched on yet. Add ANTHROPIC_API_KEY to the server settings.", code: "not_configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const orgId = profile?.organization_id as string | undefined;
    if (!orgId) return NextResponse.json({ error: "Your account has no business yet." }, { status: 400 });

    const body = await request.json().catch(() => null);
    const history = parseHistory(body);
    if (!history) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
    const tzInput = (body as { timeZone?: unknown })?.timeZone;
    const timeZone = isTimeZone(tzInput) ? tzInput : "Asia/Dubai";

    const admin = createAdminClient();
    const limited = await rateLimit(admin, `ai:user:${user.id}`, 20, 60);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const { data: org } = await supabase
      .from("organizations")
      .select("name, brand_name, country, currency, subscription_status, trial_ends_at")
      .eq("id", orgId)
      .single();
    if (!org) return NextResponse.json({ error: "Business not found." }, { status: 400 });
    const trialOver =
      (org.subscription_status ?? "trialing") === "trialing" &&
      org.trial_ends_at &&
      new Date(org.trial_ends_at).getTime() < Date.now();
    if (trialOver || org.subscription_status === "cancelled" || org.subscription_status === "past_due") {
      return NextResponse.json({ error: "Choose a plan in Settings → Billing to keep using Ask KYRO." }, { status: 402 });
    }

    const { data: allowance, error: allowErr } = await admin.rpc("ai_usage_take", { p_org: orgId });
    if (allowErr) {
      return NextResponse.json(
        { error: "Ask KYRO needs one database update. Run supabase/migrations/043_pos_staff_ai.sql in Supabase." },
        { status: 503 }
      );
    }
    const take = (Array.isArray(allowance) ? allowance[0] : allowance) as
      | { allowed: boolean; used: number; max_questions: number | null }
      | undefined;
    if (!take?.allowed) {
      return NextResponse.json(
        {
          error: `You've used all ${take?.max_questions ?? ""} Ask KYRO questions for this month. Upgrade in Settings → Billing for more.`,
          code: "limit",
        },
        { status: 429 }
      );
    }

    const client = new Anthropic();
    const today = localDate(new Date(), timeZone);
    const system = systemPrompt(
      { name: org.brand_name || org.name, country: org.country || "AE", currency: org.currency || "AED" },
      today,
      timeZone
    );
    const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
    let inputTokens = 0;
    let outputTokens = 0;
    let answer = "";

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: AI_TOOLS,
        messages,
      });
      inputTokens += response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0);
      outputTokens += response.usage.output_tokens;

      if (response.stop_reason === "refusal") {
        answer = "Sorry, I can't help with that one. Try asking about your sales, stock, customers or staff.";
        break;
      }
      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || !toolUses.length) {
        answer = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        break;
      }

      messages.push({ role: "assistant", content: response.content });
      const results = await Promise.all(
        toolUses.map(async (t) => {
          const r = await runAiTool(supabase, t.name, t.input, { timeZone });
          return {
            type: "tool_result" as const,
            tool_use_id: t.id,
            content: r.content,
            is_error: r.isError || undefined,
          };
        })
      );
      messages.push({ role: "user", content: results });
    }

    await admin.rpc("ai_usage_tokens", { p_org: orgId, p_input: inputTokens, p_output: outputTokens });

    return NextResponse.json({
      answer: answer || "I couldn't finish that one. Try asking a shorter or more specific question.",
      used: take.used,
      max: take.max_questions,
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Ask KYRO is busy right now. Try again in a minute." }, { status: 429 });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return serverError("ai", e, "Ask KYRO's API key is not valid. Check ANTHROPIC_API_KEY.");
    }
    if (e instanceof Anthropic.APIError) {
      return serverError("ai", e, "Ask KYRO could not answer just now. Please try again.");
    }
    return serverError("ai", e);
  }
}

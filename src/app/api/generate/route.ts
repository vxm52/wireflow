import Anthropic from "@anthropic-ai/sdk";
import { parse } from "@babel/parser";

const ACCEPTED_TYPES = ["image/png", "image/jpeg"] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

const PROMPT = `Convert this wireframe image into a single React function component.

Output rules:
- Output ONLY the component source. No markdown, no code fences, no prose before or after.
- Exactly one React function component named App, default-exported.
- Write NO import statements at all. React and its hooks are provided by the runtime: use useState, useEffect, etc. as if already in scope, but never write \`import\`.
- Style with Tailwind utility classes only. No external CSS and no <style> tags.
- No external assets: no remote <img src>, no icon libraries, no url() backgrounds. Represent logos and images as placeholder divs or inline SVG.
- Make it responsive. Where the wireframe is ambiguous, choose a sensible conventional layout.`;

function isAcceptedType(type: string): type is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

// Matches the first ```-fenced block (with or without an info string like
// "jsx") and captures its body.
const FIRST_FENCED_BLOCK = /```[^\n]*\n([\s\S]*?)```/;

/**
 * The prompt asks for bare source, but the model still sometimes fences it.
 * If there is a fenced block, keep only the first one's contents (dropping
 * any prose around it); otherwise keep the whole output.
 */
function extractCode(text: string): string {
  const fenced = FIRST_FENCED_BLOCK.exec(text);
  return (fenced ? fenced[1] : text).trim();
}

/**
 * POST /api/generate
 *
 * One vision call: the uploaded wireframe goes to Claude, the model's text
 * comes back as { code }. Every failure is returned as a real error — there
 * is no fallback component.
 */
export async function POST(request: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("image");
  } catch {
    return Response.json(
      { error: "Expected multipart form data with an 'image' field." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'image' file." }, { status: 400 });
  }
  if (!isAcceptedType(file.type)) {
    return Response.json(
      { error: `Unsupported image type '${file.type || "unknown"}'. Use PNG or JPG.` },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  const mediaType = file.type;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const started = Date.now();
  let msg: Anthropic.Message;
  try {
    msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      // Image -> component needs no multistep reasoning; adaptive thinking (the
      // Sonnet 5 default) would otherwise spend the max_tokens budget.
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/generate] Anthropic call failed:", message);
    return Response.json({ error: message }, { status: 502 });
  }

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const code = extractCode(text);

  console.log(
    `[api/generate] stop_reason=${msg.stop_reason} output_tokens=${msg.usage.output_tokens} model_ms=${Date.now() - started} fenced=${FIRST_FENCED_BLOCK.test(text)}`,
  );
  if (msg.stop_reason === "max_tokens") {
    return Response.json(
      { error: "generation truncated (max_tokens)" },
      { status: 502 },
    );
  }
  if (!code) {
    return Response.json(
      { error: `Model returned no text (stop_reason: ${msg.stop_reason}).` },
      { status: 502 },
    );
  }

  // Parse gate: never hand the frontend code that isn't valid JSX. The raw
  // code is included so the failure is inspectable, under a non-200 status.
  try {
    parse(code, { sourceType: "module", plugins: ["jsx"] });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn(`[api/generate] parse gate failed: ${detail}`);
    return Response.json(
      { error: "generated code failed to parse", detail, code },
      { status: 422 },
    );
  }

  return Response.json({ code });
}

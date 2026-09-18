import Anthropic from "@anthropic-ai/sdk";

const ACCEPTED_TYPES = ["image/png", "image/jpeg"] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

const FIRST_PASS_PROMPT =
  "You convert a wireframe image into a single self-contained React functional " +
  "component. Output ONLY the component code — no prose, no markdown fences. Use React " +
  "and Tailwind utility classes only. Import nothing except React. Name it App and make " +
  "it the default export. Use only standard HTML elements and Tailwind classes — no UI " +
  "library, icon package, external image, or asset. If the wireframe is ambiguous, make " +
  "a clean conventional choice. Make it responsive.";

function isAcceptedType(type: string): type is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
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

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
    const started = Date.now();
    const msg = await client.messages.create({
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
            { type: "text", text: FIRST_PASS_PROMPT },
          ],
        },
      ],
    });

    const code = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    console.log(
      `[api/generate] stop_reason=${msg.stop_reason} output_tokens=${msg.usage.output_tokens} model_ms=${Date.now() - started}`,
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

    return Response.json({ code });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/generate] Anthropic call failed:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}

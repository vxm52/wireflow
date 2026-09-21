# wireflow

**Turn a wireframe into a working React component.**

Upload a sketch — hand-drawn or digital — and wireflow uses vision to generate a clean, responsive React + Tailwind component, then renders it live in a sandboxed preview.

🔗 **Live demo:** https://wireflow-ashen.vercel.app

<!-- Optional hero: drag a demo.mp4/.gif into GitHub's README editor here, or embed docs/demo.mp4 once recorded -->

---

## What it does

wireflow takes a single image of a UI — a napkin sketch, a lo-fi mockup, a screenshot — and returns one self-contained React component styled with Tailwind. The generated source appears in a code panel and renders live, full-fidelity, in an isolated preview beside it.

It's built around one principle: **it doesn't pretend.** Every step of the pipeline either produces a real result or fails with an honest error — no mock outputs, no silent fallbacks. The UI only claims a component "rendered" when one actually mounted.

## How it works

A single pass, with no faked intermediate steps:

1. **Downscale** — the image is resized on the client (longest edge ≤ 1568px) before upload. Keeps payloads small, cuts token cost and latency, and stays under serverless body limits.
2. **Vision** — one multimodal call to Claude Sonnet 5 (`claude-sonnet-5`) with the image and a tightly constrained prompt. Thinking is disabled and effort is low: this is structured generation, not reasoning, so that's faster and keeps the model from spending its token budget thinking instead of answering.
3. **Clean** — the response is deterministically stripped of markdown fences and stray prose. The prompt asks for bare code, but a prompt isn't a guarantee, so a cleaning step enforces it.
4. **Parse-gate** — the cleaned code is validated with `@babel/parser` *before* it's ever rendered. Invalid JSX returns an honest `422` with the parser's message and the raw code, instead of crashing the preview.
5. **Render** — valid code mounts in a sandboxed iframe that loads React, Babel, and the Tailwind browser build from CDN. Arbitrary Tailwind classes are generated at runtime by the browser JIT, so the preview is styled exactly as written.

Errors surface honestly at every stage — parse failures, truncated generations, oversized images, rate limits, and runtime crashes each render in the UI's fault state rather than as a blank pane or a fake result.

## Design

The interface is a Figma-style canvas: a dotted board with the upload, code, and preview as framed panels, a warm neutral palette with a single restrained green accent, and Plus Jakarta Sans + JetBrains Mono. Empty, loading, success, and error states are all designed — the preview never shows a blank white box, and a runtime error in generated code renders its message inside the frame.

The live preview can be popped out into a full-width browser tab (the in-panel view is narrow, so desktop breakpoints don't fire there). The pop-out runs on an opaque origin, so generated code can't reach the app's own storage.

## Engineering notes

A few decisions worth calling out:

- **Reliable structured output.** Getting an LLM to reliably emit one clean, parseable component is the real problem here. wireflow layers defenses: a constrained prompt, deterministic output cleaning, a parse-gate, and a sandboxed renderer with error boundaries — each deterministic, each failure honest. No layer trusts the one before it.
- **Sandboxed preview.** Model-written code is untrusted, so it runs isolated: an `allow-scripts`-only iframe, an opaque origin for the pop-out, and imports stripped so a hallucinated dependency fails loudly (`X is not defined`) rather than being silently faked.
- **Abuse protection.** It's a public endpoint behind a paid API, so requests are rate-limited per IP with a global daily cap — fail-open, so a limiter outage doesn't take the demo down — backed by a hard provider-side spend cap.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Claude Sonnet 5** vision, via `@anthropic-ai/sdk`
- **@babel/parser** for JSX validation; **@babel/standalone** for the in-preview transform
- **Upstash Redis** + **@upstash/ratelimit** for rate limiting
- Deployed on **Vercel**

## Running locally

```bash
git clone https://github.com/vxm52/wireflow
cd wireflow
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...

# optional — rate limiting falls open if these are unset
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
DAILY_MAX=100
```

Then:

```bash
npm run dev
```

## Limitations

Honest about scope:

- Generates **one self-contained component**, not a multi-file app or a component library.
- Output is **plain JSX** (no TypeScript types), using standard elements and Tailwind — no external UI or icon libraries.
- **Single-shot**: there's no refine-from-feedback loop; you regenerate rather than iterate on a result.
- The preview needs network access to load React, Babel, and Tailwind from CDN.

---

Built by **[your name]**.

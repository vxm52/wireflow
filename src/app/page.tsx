"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tokenize, type TokenKind } from "@/components/highlight";
import {
  buildPreviewDoc,
  PREVIEW_MESSAGE_SOURCE,
  previewToken,
  type PreviewMessage,
} from "@/components/preview-doc";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  FrameIcon,
  GitHubIcon,
  MarkIcon,
  UploadIcon,
} from "@/components/icons";

const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const REPO_URL = "https://github.com/vxm52/wireflow";

// Shape of /api/generate responses: { code } on 200; { error, detail?, code? }
// otherwise (a 422 carries the unparseable code for inspection).
type GenerateBody = { code?: unknown; error?: unknown; detail?: unknown };

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; code: string }
  | { kind: "parse-error"; code: string; detail: string };

// Note: no `outline-none` here — in Tailwind v4 it sets --tw-outline-style to
// none, which would also hide the focus-visible ring.
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const isGenerating = result.kind === "loading";

  // Release the last blob URL when the page unmounts; swaps are released in
  // replacePreview below.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function replacePreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  // Shared by the file picker and drag-and-drop.
  function selectFile(selected: File | null) {
    setResult({ kind: "idle" });
    setError(null);

    if (!selected) {
      setFile(null);
      replacePreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null);
      replacePreview(null);
      setError("Unsupported file type. Choose a PNG or JPG image.");
      return;
    }
    setFile(selected);
    replacePreview(URL.createObjectURL(selected));
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (isGenerating) return;
    selectFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleGenerate() {
    if (!file) return;

    setResult({ kind: "loading" });
    setError(null);

    try {
      const body = new FormData();
      body.append("image", file);

      const res = await fetch("/api/generate", { method: "POST", body });
      const text = await res.text();
      const data = parseBody(text);

      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : text || "Empty response.";
        const detail = typeof data.detail === "string" ? data.detail : null;
        if (typeof data.code === "string") {
          // 422: the Code frame shows the parse failure and the raw code.
          setResult({ kind: "parse-error", code: data.code, detail: detail ?? message });
          return;
        }
        setResult({ kind: "idle" });
        setError(`${res.status}: ${message}${detail ? ` — ${detail}` : ""}`);
        return;
      }
      if (typeof data.code !== "string") {
        setResult({ kind: "idle" });
        setError(`${res.status}: response had no code.`);
        return;
      }
      setResult({ kind: "success", code: data.code });
    } catch (err) {
      setResult({ kind: "idle" });
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1160px] px-8 pt-[26px] pb-16 max-[800px]:px-4 max-[800px]:pt-[22px] max-[800px]:pb-12">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-[11px]">
          <div className="flex size-[33px] flex-none items-center justify-center rounded-[9px] bg-brand">
            <MarkIcon className="size-[18px] text-white" />
          </div>
          <span className="text-[17px] font-extrabold tracking-[-0.03em]">wireflow</span>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusPill generating={isGenerating} />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="wireflow source on GitHub (opens in a new tab)"
            className={`flex size-[33px] items-center justify-center rounded-full border border-line bg-[#eceae3] text-ink-2 transition-colors hover:text-ink ${FOCUS}`}
          >
            <GitHubIcon className="size-[17px]" />
          </a>
        </div>
      </header>

      <main>
        <div className="mb-[22px]">
          <h1 className="text-[33px] leading-[1.05] font-extrabold tracking-[-0.035em] max-[800px]:text-[27px]">
            Wireframe in{" "}
            {/* Drawn, not typed: Plus Jakarta's latin subset has no U+2192, so
                the character falls back to whatever the OS supplies and its
                weight and length change per platform. */}
            <ArrowRightIcon className="inline size-[0.95em] align-[-0.07em] text-spark" />
            <span className="sr-only">to</span> component out.
          </h1>
          <p className="mt-[9px] text-[15px] font-medium text-ink-2">
            Upload a sketch. Get clean, responsive React you can ship.
          </p>
        </div>

        <section
          aria-label="Upload a wireframe"
          className="rounded-panel border border-line bg-surface p-[15px] shadow-soft"
        >
          <div className="flex items-center gap-[15px] max-[800px]:flex-col max-[800px]:items-stretch">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              aria-label="Wireframe image"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              disabled={isGenerating}
              className={`flex min-w-0 flex-1 items-center gap-3.5 rounded-[11px] border-[1.5px] border-dashed px-[17px] py-[15px] text-left transition-colors disabled:cursor-not-allowed ${
                isDragging
                  ? "border-spark bg-spark-soft/40"
                  : "border-line-2 bg-inset hover:border-ink-4"
              } ${FOCUS}`}
            >
              {previewUrl && file ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL preview, not a remote asset for next/image */}
                  <img
                    src={previewUrl}
                    alt=""
                    className="size-[42px] flex-none rounded-control border border-line object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">{file.name}</span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-3">
                      {fileKind(file)} · {formatBytes(file.size)} · click or drop to replace
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-[42px] flex-none items-center justify-center rounded-control bg-well text-ink-2">
                    <UploadIcon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-semibold">
                      Drop a wireframe, or choose a file
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-3">
                      PNG or JPG · hand-drawn or digital
                    </span>
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!file || isGenerating}
              aria-busy={isGenerating}
              className={`flex flex-none items-center gap-[9px] rounded-control bg-brand py-[13px] pr-[22px] pl-[25px] text-[14.5px] font-bold text-white shadow-brand transition-[transform,box-shadow,opacity] duration-[140ms] ease-out enabled:hover:-translate-y-px enabled:hover:shadow-brand-lift disabled:cursor-not-allowed disabled:opacity-45 max-[800px]:justify-center ${FOCUS}`}
            >
              {isGenerating ? "Generating…" : "Generate"}
              <ArrowRightIcon className="size-4" />
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-control border border-fault-line bg-fault-soft px-3.5 py-2.5 text-[13px] font-medium text-fault"
            >
              <AlertIcon className="mt-px size-4 flex-none" />
              <span className="min-w-0 break-words">{error}</span>
            </p>
          )}
        </section>

        <FlowConnector />

        <p aria-live="polite" className="sr-only">
          {announcement(result)}
        </p>

        <div className="grid grid-cols-2 gap-[22px] max-[800px]:grid-cols-1">
          <CodeFrame result={result} />
          <PreviewFrame result={result} />
        </div>
      </main>
    </div>
  );
}

function StatusPill({ generating }: { generating: boolean }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-[13px] py-1.5 text-[12.5px] font-medium text-ink-2 shadow-sm"
    >
      <span
        aria-hidden
        className={`pulse-dot size-[7px] rounded-full ${generating ? "bg-brand-600" : "bg-spark"}`}
      />
      {generating ? "Generating" : "Ready"}
    </span>
  );
}

function FlowConnector() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <svg viewBox="0 0 26 52" className="h-[52px] w-[26px] overflow-visible">
        <path
          className="flow-line stroke-spark"
          d="M13 2 V40"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <path className="fill-spark" d="M13 50 L7 40 L19 40 Z" />
      </svg>
    </div>
  );
}

function FrameName({ children, fault }: { children: React.ReactNode; fault?: string }) {
  return (
    <h2 className="mb-2 ml-[3px] flex items-center gap-[7px] text-xs font-semibold text-ink-3">
      <FrameIcon className="size-[13px] text-ink-4" />
      {children}
      {fault && (
        <span className="rounded-[5px] bg-fault-soft px-1.5 py-px text-[11px] font-semibold text-fault">
          {fault}
        </span>
      )}
    </h2>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[46px] items-center justify-between gap-3 border-b border-line px-3.5 py-[11px]">
      {children}
    </div>
  );
}

function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-t border-line px-3.5 py-[9px] text-[11.5px] text-ink-3">
      {children}
    </div>
  );
}

function CodeFrame({ result }: { result: Result }) {
  const code = result.kind === "success" || result.kind === "parse-error" ? result.code : null;
  const failed = result.kind === "parse-error";
  const lines = code ? code.split("\n").length : null;

  return (
    <section aria-labelledby="code-frame" className="flex min-w-0 flex-col">
      <FrameName fault={failed ? "failed to parse" : undefined}>
        <span id="code-frame">Code</span>
      </FrameName>
      <div
        className={`flex flex-1 flex-col overflow-hidden rounded-panel border bg-surface shadow-soft ${
          failed ? "border-fault-line" : "border-line"
        }`}
      >
        <PanelHeader>
          <span className="font-mono text-[11px] text-ink-3">component.jsx</span>
          <CopyButton code={code} />
        </PanelHeader>

        {failed && (
          <div
            role="alert"
            className="flex items-start gap-2.5 border-b border-fault-line bg-fault-soft px-[17px] py-3"
          >
            <AlertIcon className="mt-0.5 size-4 flex-none text-fault" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-fault">Generated code failed to parse</p>
              <p className="mt-0.5 font-mono text-[11.5px] break-words text-fault/85">
                {result.detail}
              </p>
            </div>
          </div>
        )}

        <div className="flex min-h-[330px] flex-1 flex-col bg-inset">
          {result.kind === "idle" && (
            <EmptyState
              icon={<CodeIcon className="size-5" />}
              title="No code yet"
              body="Choose a wireframe and hit Generate. The component’s source lands here."
            />
          )}
          {result.kind === "loading" && <CodeSkeleton />}
          {code !== null && (
            <pre
              tabIndex={0}
              aria-label={failed ? "Raw generated code (did not parse)" : "Generated component code"}
              className={`max-h-[560px] flex-1 overflow-auto px-[17px] py-[15px] font-mono text-[12.5px] leading-[1.9] [font-variant-ligatures:none] focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-brand-600 ${
                failed ? "text-ink-2" : "text-ink"
              }`}
            >
              <code>{failed ? code : <Highlighted source={code} />}</code>
            </pre>
          )}
        </div>

        <PanelFooter>
          {lines === null ? (
            <span className="font-mono text-[11px]">
              {result.kind === "loading" ? "generating…" : "no code yet"}
            </span>
          ) : (
            <>
              <span className="font-mono text-[11px]">
                {lines} {lines === 1 ? "line" : "lines"}
              </span>
              · <span className="font-mono text-[11px]">jsx</span>
              {failed && (
                <>
                  · <span className="font-mono text-[11px] font-medium text-fault">did not parse</span>
                </>
              )}
            </>
          )}
        </PanelFooter>
      </div>
    </section>
  );
}

const TOKEN_CLASS: Record<TokenKind, string | undefined> = {
  plain: undefined,
  kw: "text-brand-600",
  fn: "font-medium text-ink",
  str: "text-syn-str",
  mut: "text-ink-3",
  tag: "text-ink-2",
  at: "text-syn-attr",
};

function Highlighted({ source }: { source: string }) {
  return tokenize(source).map((token, i) =>
    TOKEN_CLASS[token.kind] ? (
      <span key={i} className={TOKEN_CLASS[token.kind]}>
        {token.text}
      </span>
    ) : (
      token.text
    ),
  );
}

function CodeSkeleton() {
  const widths = ["42%", "68%", "61%", "0", "30%", "78%", "55%", "71%", "48%", "0", "36%"];
  return (
    <div className="flex-1 px-[17px] py-[18px]">
      <p className="mb-4 font-mono text-[11.5px] text-ink-3">Generating component…</p>
      <div className="space-y-[11px]" aria-hidden>
        {widths.map((w, i) => (
          <div key={i} className="h-[9px] rounded-full bg-line" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

function CopyButton({ code }: { code: string | null }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 1600);
  }

  const label = { idle: "Copy", copied: "Copied", failed: "Copy failed" }[status];

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!code}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition-colors enabled:hover:bg-inset disabled:cursor-not-allowed disabled:opacity-45 ${
        status === "failed" ? "text-fault" : "text-ink-2"
      } ${FOCUS}`}
    >
      {status === "copied" ? (
        <CheckIcon className="size-[13px] text-spark" />
      ) : (
        <CopyIcon className="size-[13px]" />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}

// What the preview sandbox has told us about the current component. The
// Preview may only claim to have rendered once the iframe says a component
// actually mounted.
type MountState =
  | { kind: "pending" }
  | { kind: "mounted" }
  | { kind: "failed"; message: string };

const VIEWPORTS = [
  { id: "desktop", label: "Desktop" },
  { id: "mobile", label: "Mobile" },
] as const;

type Viewport = (typeof VIEWPORTS)[number]["id"];

// Backstop for an iframe that never loads or never speaks at all; the
// in-document watchdog handles the cases where its scripts did run.
const SANDBOX_TIMEOUT_MS = 15_000;

// Why the preview can't render, when there is nothing to render.
const NOTHING_TO_RENDER: Record<Result["kind"], string> = {
  idle: "nothing generated yet",
  loading: "waiting on the model",
  success: "",
  "parse-error": "code did not parse",
};

function PreviewFrame({ result }: { result: Result }) {
  const code = result.kind === "success" ? result.code : null;
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reported, setReported] = useState<{ token: string; state: MountState } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const token = useMemo(() => (code === null ? "" : previewToken(code)), [code]);
  const srcDoc = useMemo(
    () => (code === null ? null : buildPreviewDoc(code, token)),
    [code, token],
  );

  // Anything reported about an earlier document is not about this one, so a
  // token mismatch simply reads as pending — no state reset on swap.
  const mount: MountState =
    reported && reported.token === token ? reported.state : { kind: "pending" };

  useEffect(() => {
    if (srcDoc === null) return;

    function onMessage(event: MessageEvent) {
      // The iframe is sandboxed without allow-same-origin, so its origin is
      // the opaque "null" and useless as a check. Identity of the window it
      // came from, plus the token, is what says this is our preview talking.
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as Partial<PreviewMessage> | null;
      if (!data || data.source !== PREVIEW_MESSAGE_SOURCE || data.token !== token) return;

      if (data.status === "error") {
        setReported({
          token,
          state: { kind: "failed", message: data.message || "Unknown error." },
        });
      } else if (data.status === "mounted") {
        // A reported failure is the truth; never downgrade it to a success.
        setReported((prev) =>
          prev?.token === token && prev.state.kind === "failed"
            ? prev
            : { token, state: { kind: "mounted" } },
        );
      }
    }

    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => {
      setReported((prev) =>
        prev?.token === token
          ? prev
          : { token, state: { kind: "failed", message: "No response from the preview sandbox." } },
      );
    }, SANDBOX_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [srcDoc, token]);

  const failed = srcDoc !== null && mount.kind === "failed";
  const message = {
    idle: { title: "Nothing to preview yet", body: "Generate a component to see it here." },
    loading: { title: "Generating…", body: "Waiting on the model." },
    success: { title: "", body: "" }, // unused: the iframe has the screen
    "parse-error": {
      title: "Nothing to render",
      body: "The generated code didn’t parse, so there is nothing to preview.",
    },
  }[result.kind];

  return (
    <section aria-labelledby="preview-frame" className="flex min-w-0 flex-col">
      <FrameName fault={failed ? "render failed" : undefined}>
        <span id="preview-frame">Preview</span>
      </FrameName>
      <div
        className={`flex flex-1 flex-col overflow-hidden rounded-panel border bg-surface ${
          failed
            ? "border-fault-line shadow-[0_0_0_3px_var(--color-fault-soft),var(--shadow-soft)]"
            : "border-spark shadow-[0_0_0_3px_var(--color-spark-soft),var(--shadow-soft)]"
        }`}
      >
        <PanelHeader>
          <span className="font-mono text-[11px] text-ink-3">localhost</span>
          <div
            role="radiogroup"
            aria-label="Preview viewport"
            className="flex rounded-lg border border-line bg-inset p-[3px]"
          >
            {VIEWPORTS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={viewport === id}
                onClick={() => setViewport(id)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  viewport === id
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-3 hover:text-ink-2"
                } ${FOCUS}`}
              >
                {label}
              </button>
            ))}
          </div>
        </PanelHeader>

        <div className="screen-dots relative flex min-h-[330px] flex-1 flex-col">
          {srcDoc === null ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="w-full max-w-[280px] rounded-[14px] border border-dashed border-line-2 bg-surface/80 px-6 py-7 text-center">
                <div className="mx-auto mb-3.5 flex size-[38px] items-center justify-center rounded-control bg-well">
                  <FrameIcon className="size-4 text-ink-4" />
                </div>
                <p className="text-[14.5px] font-bold tracking-[-0.01em]">{message.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-3">{message.body}</p>
              </div>
            </div>
          ) : (
            // Absolute so the iframe gets a definite box to fill, whatever
            // height the grid row settles on.
            <div
              className={`absolute inset-0 flex ${
                viewport === "mobile" ? "justify-center p-4" : ""
              }`}
            >
              <iframe
                key={token}
                ref={frameRef}
                srcDoc={srcDoc}
                title="Live preview of the generated component"
                // No allow-same-origin: model-written code must not reach this
                // origin's storage, cookies or DOM.
                sandbox="allow-scripts"
                className={`h-full border-0 bg-white ${
                  viewport === "mobile"
                    ? "w-[390px] max-w-full flex-none rounded-xl border border-line shadow-soft"
                    : "w-full"
                }`}
              />
            </div>
          )}
        </div>

        <PanelFooter>
          {srcDoc === null ? (
            <>
              <span className="font-medium">Not rendered</span> ·{" "}
              <span className="font-mono text-[11px]">{NOTHING_TO_RENDER[result.kind]}</span>
            </>
          ) : mount.kind === "mounted" ? (
            <>
              <span className="font-medium text-ink-2">Rendered</span> ·{" "}
              <span className="font-mono text-[11px]">
                sandboxed iframe · react 18 · tailwind 4
              </span>
            </>
          ) : mount.kind === "failed" ? (
            <>
              <span className="flex-none font-medium text-fault">Failed to render</span> ·{" "}
              <span className="min-w-0 truncate font-mono text-[11px] text-fault/85">
                {mount.message}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">Rendering…</span> ·{" "}
              <span className="font-mono text-[11px]">loading sandbox</span>
            </>
          )}
        </PanelFooter>
      </div>
    </section>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
      <div className="mb-3.5 flex size-[42px] items-center justify-center rounded-control bg-well text-ink-3">
        {icon}
      </div>
      <p className="text-[14.5px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

// Route responses are JSON; anything else (e.g. a platform error page) yields
// an empty object so the caller falls back to the raw text.
function parseBody(text: string): GenerateBody {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed as GenerateBody;
  } catch {}
  return {};
}

// Short screen-reader summary of the result; the code itself is never
// announced.
function announcement(result: Result): string {
  switch (result.kind) {
    case "idle":
      return "";
    case "loading":
      return "Generating component.";
    case "success":
      return `Component generated, ${result.code.split("\n").length} lines.`;
    case "parse-error":
      return "Generated code failed to parse.";
  }
}

function fileKind(file: File): string {
  return file.type === "image/png" ? "PNG" : "JPG";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

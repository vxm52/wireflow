"use client";

import { useEffect, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setCode(null);
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

  async function handleGenerate() {
    if (!file) return;

    setIsGenerating(true);
    setCode(null);
    setError(null);

    try {
      const body = new FormData();
      body.append("image", file);

      const res = await fetch("/api/generate", { method: "POST", body });
      const text = await res.text();

      if (!res.ok) {
        setError(`${res.status}: ${errorMessageFrom(text)}`);
        return;
      }
      setCode((JSON.parse(text) as { code: string }).code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">wireflow</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Turn a wireframe image into React code.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Choose image
          </button>

          {previewUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL preview, not a remote asset for next/image */}
              <img
                src={previewUrl}
                alt="Selected wireframe preview"
                className="h-14 w-14 rounded border border-neutral-200 object-cover dark:border-neutral-800"
              />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {file?.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              PNG or JPG
            </span>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!file || isGenerating}
            className="ml-auto rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ResultPane label="Code">
          {code && (
            <pre className="max-h-[36rem] overflow-auto p-4 font-mono text-xs leading-relaxed">
              {code}
            </pre>
          )}
        </ResultPane>
        <ResultPane label="Preview" />
      </div>
    </main>
  );
}

// Route errors are JSON { error }; anything else (e.g. a platform error page)
// is shown raw.
function errorMessageFrom(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {}
  return body || "Empty response.";
}

function ResultPane({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-64 min-w-0 flex-col rounded-lg border border-neutral-200 dark:border-neutral-800">
      <h2 className="border-b border-neutral-200 px-4 py-2 text-sm font-medium dark:border-neutral-800">
        {label}
      </h2>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

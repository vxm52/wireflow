// Builds the self-contained HTML document that the Preview <iframe> runs as
// its srcdoc.
//
// Why a document rather than rendering the component in this app: Tailwind
// only emits the classes it saw at build time, so classes the model invents
// would arrive unstyled. The Tailwind *browser* build is a runtime JIT — it
// watches the DOM and generates CSS for whatever classes show up. So the
// preview needs its own document, with its own React (independent of this
// app's React 19) and its own compiler. Running it in a sandboxed iframe with
// no same-origin access is also what keeps model-written code away from this
// origin.

// Pinned exactly — a floating major would let a CDN release change what the
// preview runs underneath us.
const TAILWIND_SRC =
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.min.js";
// Development builds on purpose: React's dev bundles carry readable error
// messages, and the whole point of this frame is showing the real failure.
const REACT_SRC = "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js";
const REACT_DOM_SRC = "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js";
const BABEL_SRC = "https://cdn.jsdelivr.net/npm/@babel/standalone@7.29.9/babel.min.js";

/** How long the iframe waits for its CDN runtime before calling it a failure. */
const RUNTIME_TIMEOUT_MS = 6000;

/** Identifies messages posted from a preview iframe back to the page. */
export const PREVIEW_MESSAGE_SOURCE = "wireflow-preview";

export type PreviewMessage =
  | { source: typeof PREVIEW_MESSAGE_SOURCE; token: string; status: "mounted"; message: null }
  | { source: typeof PREVIEW_MESSAGE_SOURCE; token: string; status: "error"; message: string };

const IMPORT_LINE = /^\s*import\s/;
// `export default App;` — the whole line goes, the declaration stays above it.
const DEFAULT_EXPORT_OF_NAME = /^\s*export\s+default\s+[A-Za-z_$][\w$]*\s*;?\s*$/;
// `export default function App(` / `export const x =` — only the keywords go.
const EXPORT_KEYWORDS = /^(\s*)export\s+(?:default\s+)?(?=(?:async\s+)?(?:function|class|const|let|var)\b)/;

/**
 * Removes the module syntax the iframe cannot execute.
 *
 * The document runs classic scripts: there is no module resolution, so an
 * `import` would be a hard syntax error before any of the component ran, and
 * a top-level `export` would be one too. React and its hooks are supplied as
 * globals instead. Dropping imports rather than rewriting them is deliberate —
 * a component that really needed an external package now fails at the point it
 * uses it, which the error boundary reports honestly, instead of silently
 * rendering something that isn't what the model wrote.
 */
export function stripModuleSyntax(code: string): string {
  return code
    .split("\n")
    .filter((line) => !IMPORT_LINE.test(line) && !DEFAULT_EXPORT_OF_NAME.test(line))
    .map((line) => line.replace(EXPORT_KEYWORDS, "$1"))
    .join("\n");
}

/**
 * Stable per-document id, derived from the code itself (FNV-1a). It keys the
 * iframe and tags the messages that document posts back, so a superseded
 * preview can't report over a live one — while identical code keeps the same
 * id and is not needlessly torn down and re-mounted.
 */
export function previewToken(code: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * `</script` anywhere in the source — inside a string literal, most likely —
 * would close the host <script> element early and shred the document. Inside
 * JS the escaped form is the same string.
 */
function neutralizeScriptClose(code: string): string {
  return code.replace(/<\/(script)/gi, "<\\/$1");
}

/**
 * Styling for the failure treatment, written as plain CSS rather than Tailwind
 * classes: an error box has to render even when the failure *is* that the
 * Tailwind CDN never loaded. Colours mirror the app's fault tokens.
 */
const FAULT_CSS = `
  html, body { margin: 0; }
  body { background: #ffffff; }
  .wf-fault {
    margin: 20px;
    padding: 16px 18px;
    border: 1px solid #efcfc6;
    border-radius: 12px;
    background: #f8e7e2;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .wf-fault-title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #b4412e;
  }
  .wf-fault-message {
    margin: 6px 0 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: rgba(180, 65, 46, 0.88);
  }
`;

/**
 * Runs before anything else, as a classic script, so that a failure in the
 * *loading* of React/Babel/Tailwind still has somewhere to land. Everything
 * the rest of the document reports through goes on window.__wf.
 */
function runtimeScript(token: string): string {
  return `
(function () {
  var TOKEN = ${JSON.stringify(token)};

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  window.__wf = {
    // The page listens for these to decide whether it may honestly claim the
    // component rendered. targetOrigin is "*" because this document is
    // sandboxed without allow-same-origin, so it has no origin to name; the
    // page verifies the sender by contentWindow identity and this token.
    post: function (status, message) {
      try {
        parent.postMessage(
          { source: "${PREVIEW_MESSAGE_SOURCE}", token: TOKEN, status: status, message: message || null },
          "*"
        );
      } catch (e) {}
    },
    fail: function (err) {
      var message = err && err.message ? err.message : String(err);
      var root = document.getElementById("root");
      // Only claim the screen if nothing rendered — a later error must not
      // wipe out a component that did mount.
      if (root && !root.firstChild) {
        root.innerHTML =
          '<div class="wf-fault">' +
          '<p class="wf-fault-title">The preview could not run</p>' +
          '<p class="wf-fault-message">' + escapeHtml(message) + "</p>" +
          "</div>";
      }
      window.__wf.post("error", message);
    }
  };

  // Catches what the error boundary cannot: compile errors from Babel,
  // top-level throws, and anything async.
  window.onerror = function (message, source, lineno, colno, error) {
    window.__wf.fail(error || message);
    return true;
  };
  window.addEventListener("unhandledrejection", function (event) {
    window.__wf.fail(event.reason);
  });
})();
`;
}

/** Last resort: nothing rendered and nothing threw, i.e. a script never arrived. */
function watchdogScript(): string {
  return `
setTimeout(function () {
  var root = document.getElementById("root");
  if (root && !root.firstChild) {
    window.__wf.fail(
      new Error("Preview runtime did not start \\u2014 React, Babel or Tailwind could not be loaded from the CDN.")
    );
  }
}, ${RUNTIME_TIMEOUT_MS});
`;
}

/**
 * The component's own script. Compiled in the browser by @babel/standalone
 * with the react preset, which is what turns the model's JSX into calls.
 */
function componentScript(code: string): string {
  return `
const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, useId } = React;

/* ---- generated component ---- */
${code}
/* ---- end generated component ---- */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error };
  }
  componentDidCatch(error) {
    window.__wf.post("error", messageOf(error));
  }
  componentDidMount() {
    var self = this;
    // componentDidCatch lands in this same commit; defer a tick so a crash is
    // never reported as a successful mount.
    setTimeout(function () {
      if (!self.state.error) window.__wf.post("mounted");
    }, 0);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="wf-fault">
          <p className="wf-fault-title">The component crashed while rendering</p>
          <p className="wf-fault-message">{messageOf(this.state.error)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function messageOf(error) {
  return error && error.message ? error.message : String(error);
}

// Backstop for a throw before React ever gets involved — most commonly App
// not being defined at all.
try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (err) {
  window.__wf.fail(err);
}
`;
}

/**
 * Host shell for opening a preview in a real browser tab.
 *
 * A tab needs a URL, and the only scheme that can carry a whole document is
 * blob: — browsers refuse top-frame navigation to data: outright, whatever its
 * length. But a blob: URL inherits this app's origin, so handing the preview
 * document straight to window.open would run model-written code *on our
 * origin*, with our storage — exactly what the in-panel iframe exists to
 * prevent.
 *
 * So the tab gets this instead: a document that contains no generated code at
 * all, only a full-viewport sandboxed iframe pointing at the preview document's
 * own blob URL. The sandbox attribute forces an opaque origin on the child, so
 * the component runs with no more reach than it has in the panel, while the
 * iframe fills the window and its md:/lg: breakpoints finally match.
 *
 * Note there is no script here, and the payload is passed by URL rather than
 * inlined: nothing to escape, and the wrapper cannot relay the mount messages
 * the preview document posts to its parent — an opened tab is fire-and-forget,
 * and only the in-panel iframe reports mount state.
 *
 * @param childUrl Object URL of a document built by buildPreviewDoc.
 */
export function buildSandboxWrapperDoc(childUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Generated component preview</title>
<style>html, body { margin: 0; height: 100%; background: #ffffff; }</style>
</head>
<body>
<iframe
  src="${childUrl}"
  title="Generated component preview"
  sandbox="allow-scripts"
  style="border:0;position:fixed;inset:0;width:100%;height:100%"
></iframe>
</body>
</html>`;
}

/**
 * @param code  Component source as returned by /api/generate (already
 *              parse-gated server-side).
 * @param token Per-document id from previewToken, echoed back on every
 *              postMessage so the page can ignore a superseded preview.
 */
export function buildPreviewDoc(code: string, token: string): string {
  const source = neutralizeScriptClose(stripModuleSyntax(code));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Generated component preview</title>
<script>${runtimeScript(token)}</script>
<style>${FAULT_CSS}</style>
<script src="${TAILWIND_SRC}"></script>
<script src="${REACT_SRC}"></script>
<script src="${REACT_DOM_SRC}"></script>
<script src="${BABEL_SRC}"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">${componentScript(source)}</script>
<script>${watchdogScript()}</script>
</body>
</html>`;
}

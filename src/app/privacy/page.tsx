import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";

const REPO_URL = "https://github.com/vxm52/wireflow";

export const metadata: Metadata = {
  title: "Privacy — wireflow",
  description: "What happens to data when you use wireflow.",
};

// Same ring as the app shell (see FOCUS in src/app/page.tsx): no `outline-none`,
// which in Tailwind v4 would also hide the focus-visible ring.
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-brand-600";

// The policy, verbatim. Each entry is one paragraph: a bold run-in lead,
// then the prose it introduces. Kept as data (not JSX text) so the copy stays
// byte-for-byte and apostrophes need no entity escaping.
const SECTIONS: { lead: string; body: ReactNode }[] = [
  {
    lead: "What you upload.",
    body: "When you submit a wireframe image, it's resized in your browser and sent to Anthropic's API, which generates the component code. Anthropic processes the image to produce the response and, under its commercial terms, does not use API inputs or outputs to train its models; it deletes them within 30 days. wireflow itself does not store your image or the generated code — both exist only for the duration of the request and are never written to a database or logged.",
  },
  {
    lead: "Your IP address.",
    body: "To prevent abuse of a public, cost-bearing service, wireflow records your IP address in a temporary rate-limiting store (Upstash Redis) as a short-lived counter. These entries expire automatically within about 48 hours and are never used for any other purpose.",
  },
  {
    lead: "What we don't do.",
    body: "No accounts, no cookies, no analytics, no tracking, no advertising. We don't sell or share data. Nothing you upload is retained by wireflow after your request completes.",
  },
  {
    lead: "Third parties.",
    body: "wireflow relies on Anthropic (code generation), Upstash (rate limiting), and Vercel (hosting). Each processes data only as needed to provide its service.",
  },
  {
    lead: "Contact.",
    body: (
      <>
        Questions? Open an issue on the GitHub repo:{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-medium text-brand-600 underline decoration-line-2 decoration-1 underline-offset-[3px] transition-colors hover:decoration-brand-600 ${FOCUS}`}
        >
          {REPO_URL}
        </a>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    // `flex-1` + a solid canvas: this fills the flex body and covers the dot
    // grid painted on <body>, which reads as noise behind long-form text.
    <div className="flex-1 bg-bg">
      <div className="mx-auto w-full max-w-[680px] px-8 pt-[26px] pb-20 max-[800px]:px-4 max-[800px]:pt-[22px] max-[800px]:pb-14">
        <Link
          href="/"
          className={`inline-flex items-center gap-[7px] rounded-sm text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink ${FOCUS}`}
        >
          {/* Drawn, not typed: Plus Jakarta's latin subset has no U+2190. */}
          <ArrowRightIcon className="size-[15px] rotate-180" />
          wireflow
        </Link>

        <header className="mt-7 border-b border-line pb-7">
          <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em]">
            Privacy Policy
          </h1>
          <p className="mt-2.5 text-[13px] font-medium text-ink-3">
            Last updated: October 3, 2026
          </p>
        </header>

        <p className="mt-7 text-[15px] leading-[1.75] text-ink-2">
          wireflow is a demo project. This policy explains, plainly, what happens to data
          when you use it.
        </p>

        {SECTIONS.map((section) => (
          <p key={section.lead} className="mt-6 text-[15px] leading-[1.75] text-ink-2">
            <strong className="font-bold text-ink">{section.lead}</strong>{" "}
            {section.body}
          </p>
        ))}
      </div>
    </div>
  );
}

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import { ChatStatCards, type ChatStatCard } from "./ChatStatCards";

const statCardSchema = z.object({
  label: z.string(),
  value: z.string(),
  sub: z.string().optional(),
  trend: z.number().optional(),
  trendGoodWhenDown: z.boolean().optional(),
  icon: z.string().optional(),
});
const statsBlockSchema = z.array(statCardSchema).min(1).max(4);

/** Renders an assistant message as markdown, with ```stats``` code blocks promoted to KPI cards. */
export function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-muted-foreground/30 text-muted-foreground my-2 border-l-2 pl-2 italic">
            {children}
          </blockquote>
        ),
        h1: ({ children }) => <p className="mb-1 font-bold">{children}</p>,
        h2: ({ children }) => <p className="mb-1 font-bold">{children}</p>,
        h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
        hr: () => <hr className="border-border my-2" />,
        table: ({ children }) => (
          <div className="my-2 -mx-1 overflow-x-auto">
            <table className="border-border border-collapse text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-border border-b">{children}</thead>,
        tr: ({ children }) => <tr className="border-border border-b last:border-0">{children}</tr>,
        th: ({ children }) => (
          <th className="px-2 py-1 text-left font-semibold whitespace-nowrap">{children}</th>
        ),
        td: ({ children }) => <td className="px-2 py-1 align-top">{children}</td>,
        pre: ({ children }) => <>{children}</>,
        code(props) {
          const { children, className } = props;
          const match = /language-(\w+)/.exec(className ?? "");
          const raw = String(children).replace(/\n$/, "");

          if (match?.[1] === "stats") {
            try {
              const cards = statsBlockSchema.parse(JSON.parse(raw));
              return <ChatStatCards cards={cards as ChatStatCard[]} />;
            } catch {
              // malformed — fall through and show it as a plain code block instead
            }
          }

          if (match) {
            return (
              <pre className="bg-muted my-2 overflow-x-auto rounded-lg p-2 text-xs">
                <code>{raw}</code>
              </pre>
            );
          }

          return <code className="bg-muted rounded px-1 py-0.5 text-xs">{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

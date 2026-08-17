"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const TOOLS = [
  { name: "Excel", color: "#217346" },
  { name: "Outlook", color: "#0078D4" },
  { name: "Gmail", color: "#EA4335" },
  { name: "Google Sheets", color: "#0F9D58" },
  { name: "WhatsApp", color: "#25D366" },
  { name: "Google Drive", color: "#1FA463" },
  { name: "Jira", color: "#0052CC" },
];

export function ToolsStrip() {
  const { t } = useLanguage();

  return (
    <section className="relative mx-6 my-24 max-w-full overflow-hidden rounded-2xl bg-[#F3F8FF] shadow">
      <div className="flex w-full flex-col items-center justify-center space-y-4 px-6 py-16 text-center sm:px-0">
        <h3 className="text-2xl font-semibold text-foreground">{t.toolsStrip.heading}</h3>
        <p className="max-w-xl text-body">{t.toolsStrip.description}</p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tool.color }}
                aria-hidden
              />
              <span className="text-sm font-medium text-foreground">{tool.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Suspense } from "react";
import { aiEnabled } from "@/lib/ai/client";
import { LogTabs } from "@/components/log/LogTabs";

export const metadata = { title: "Log" };

export default function LogPage() {
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Log</h1>
        <p className="text-muted-foreground text-sm">Quick-add an entry</p>
      </header>
      <Suspense>
        <LogTabs aiEnabled={aiEnabled()} />
      </Suspense>
    </div>
  );
}

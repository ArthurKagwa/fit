"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function PlanItemCheckbox({
  id,
  completed,
  label,
}: {
  id: string;
  completed: boolean;
  label: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(completed);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setChecked(next);
    setBusy(true);
    const res = await fetch(`/api/plan/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setChecked(!next);
      toast.error("Could not update the session.");
      return;
    }
    if (next) toast.success(`Done: ${label}`);
    router.refresh();
  }

  return (
    <Checkbox
      checked={checked}
      disabled={busy}
      onCheckedChange={(value) => toggle(value === true)}
      aria-label={`Mark "${label}" ${checked ? "not done" : "done"}`}
    />
  );
}

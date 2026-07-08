"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteEntryButton({
  type,
  id,
  label,
  redirectTo,
  iconOnly = true,
}: {
  type: string;
  id: string;
  label: string;
  /** Where to navigate after a successful delete. Defaults to refreshing the current page. */
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const res = await fetch(`/api/entries/${type}/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Could not delete the entry.");
      return;
    }
    toast.success("Entry deleted");
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7"
            aria-label={`Delete ${label}`}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive flex-1"
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            {label} will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

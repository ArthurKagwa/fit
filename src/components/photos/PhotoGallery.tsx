"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, GitCompareArrows, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { compressImage } from "@/lib/image-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Photo = {
  id: string;
  fileUrl: string;
  takenAt: string;
  note: string | null;
  weightKg: number | null;
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Photo[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", await compressImage(file, 1600));
      const res = await fetch("/api/photos", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Upload failed.");
        return;
      }
      toast.success("Photo added");
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(photo: Photo) {
    const res = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete the photo.");
      return;
    }
    setSelected((s) => s.filter((p) => p.id !== photo.id));
    toast.success("Photo deleted");
    router.refresh();
  }

  function toggleSelect(photo: Photo) {
    setSelected((current) => {
      if (current.some((p) => p.id === photo.id)) {
        return current.filter((p) => p.id !== photo.id);
      }
      const next = [...current, photo].slice(-2);
      if (next.length === 2) setCompareOpen(true);
      return next;
    });
  }

  const ordered = [...selected].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  );

  return (
    <div className="grid gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      <div className="flex gap-2">
        <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-1">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Add photo
        </Button>
        {photos.length >= 2 && (
          <Button
            variant={compareMode ? "default" : "outline"}
            onClick={() => {
              setCompareMode((v) => !v);
              setSelected([]);
            }}
          >
            <GitCompareArrows className="size-4" />
            {compareMode ? "Cancel" : "Compare"}
          </Button>
        )}
      </div>

      {compareMode && (
        <p className="text-muted-foreground text-sm">Tap two photos to compare them side by side.</p>
      )}

      {photos.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No progress photos yet"
          description="Same pose, same light, every couple of weeks — future you will thank you."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => {
            const isSelected = selected.some((p) => p.id === photo.id);
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => (compareMode ? toggleSelect(photo) : undefined)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border text-left",
                  compareMode && "cursor-pointer",
                  isSelected && "ring-primary ring-2"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.fileUrl}
                  alt={photo.note ?? `Progress photo ${formatDate(photo.takenAt)}`}
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs font-medium text-white">
                    {formatDate(photo.takenAt)}
                    {photo.weightKg ? ` · ${photo.weightKg} kg` : ""}
                  </p>
                </div>
                {!compareMode && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Delete photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(photo);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        remove(photo);
                      }
                    }}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={compareOpen && ordered.length === 2}
        onOpenChange={(open) => {
          setCompareOpen(open);
          if (!open) {
            setSelected([]);
            setCompareMode(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Progress comparison</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ordered.map((photo) => (
              <figure key={photo.id} className="grid gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.fileUrl}
                  alt={`Progress ${formatDate(photo.takenAt)}`}
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
                <figcaption className="text-muted-foreground text-center text-xs">
                  {formatDate(photo.takenAt)}
                  {photo.weightKg ? ` · ${photo.weightKg} kg` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

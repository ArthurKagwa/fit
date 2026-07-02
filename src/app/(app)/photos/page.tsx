import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PhotoGallery } from "@/components/photos/PhotoGallery";

export const metadata = { title: "Progress photos" };

export default async function PhotosPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const photos = await prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { takenAt: "desc" },
    take: 200,
  });

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Progress photos</h1>
        <p className="text-muted-foreground text-sm">See the change that scales can’t show</p>
      </header>
      <PhotoGallery
        photos={photos.map((p) => ({
          id: p.id,
          fileUrl: p.fileUrl,
          takenAt: p.takenAt.toISOString(),
          note: p.note,
          weightKg: p.weightKg,
        }))}
      />
    </div>
  );
}

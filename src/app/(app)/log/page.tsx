"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeightForm } from "@/components/forms/WeightForm";
import { RunForm } from "@/components/forms/RunForm";
import { MealForm } from "@/components/forms/MealForm";
import { WorkoutForm } from "@/components/forms/WorkoutForm";

function LogTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "weight";

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => router.replace(`/log?tab=${value}`, { scroll: false })}
    >
      <TabsList className="w-full">
        <TabsTrigger value="weight">Weight</TabsTrigger>
        <TabsTrigger value="run">Run</TabsTrigger>
        <TabsTrigger value="meal">Meal</TabsTrigger>
        <TabsTrigger value="workout">Workout</TabsTrigger>
      </TabsList>
      <Card>
        <CardContent>
          <TabsContent value="weight">
            <WeightForm />
          </TabsContent>
          <TabsContent value="run">
            <RunForm />
          </TabsContent>
          <TabsContent value="meal">
            <MealForm />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutForm />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

export default function LogPage() {
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Log</h1>
        <p className="text-muted-foreground text-sm">Quick-add an entry</p>
      </header>
      <Suspense>
        <LogTabs />
      </Suspense>
    </div>
  );
}

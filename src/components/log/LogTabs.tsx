"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeightForm } from "@/components/forms/WeightForm";
import { RunForm } from "@/components/forms/RunForm";
import { MealForm } from "@/components/forms/MealForm";
import { WorkoutForm } from "@/components/forms/WorkoutForm";

export function LogTabs({ aiEnabled }: { aiEnabled: boolean }) {
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
            <RunForm aiEnabled={aiEnabled} />
          </TabsContent>
          <TabsContent value="meal">
            <MealForm aiEnabled={aiEnabled} />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutForm />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

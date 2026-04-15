import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, TrendingUp, Calendar } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-slate-400 mt-1">
          Continue your data engineering interview prep journey.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Current Streak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 days</div>
            <p className="text-xs text-slate-500">Start practicing to build your streak</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Problems Solved
            </CardTitle>
            <Brain className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-500">Across all topics</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Study Plan
            </CardTitle>
            <Target className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Not set</div>
            <p className="text-xs text-slate-500">Complete onboarding to get your plan</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Interview Date
            </CardTitle>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Not set</div>
            <p className="text-xs text-slate-500">Set your target date</p>
          </CardContent>
        </Card>
      </div>

      {/* Prep Areas */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle>Your Prep Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: "Python", progress: 0 },
              { name: "SQL", progress: 0 },
              { name: "System Design", progress: 0 },
              { name: "Data Modeling", progress: 0 },
              { name: "Culture Fit", progress: 0 },
            ].map((area) => (
              <div
                key={area.name}
                className="p-4 rounded-lg border border-slate-800 bg-slate-950/50 text-center"
              >
                <p className="font-medium mb-2">{area.name}</p>
                <Badge
                  variant="secondary"
                  className="bg-slate-800 text-slate-400"
                >
                  {area.progress}% complete
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

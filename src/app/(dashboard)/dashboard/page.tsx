import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, TrendingUp, Calendar } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  // Check onboarding — redirect if not done
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      onboardingDone: true,
      targetCompanies: true,
      interviewDate: true,
      skillLevel: true,
      hoursPerDay: true,
      strengths: true,
      weaknesses: true,
    },
  });

  if (!profile?.onboardingDone) {
    redirect("/onboarding");
  }

  const daysUntilInterview = profile.interviewDate
    ? Math.ceil(
        (profile.interviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

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
              Skill Level
            </CardTitle>
            <Target className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {profile.skillLevel.toLowerCase()}
            </div>
            <p className="text-xs text-slate-500">{profile.hoursPerDay} hrs/day commitment</p>
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
            {daysUntilInterview !== null ? (
              <>
                <div className="text-2xl font-bold">{daysUntilInterview} days</div>
                <p className="text-xs text-slate-500">
                  {profile.interviewDate!.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">Not set</div>
                <p className="text-xs text-slate-500">Set your target date in settings</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Companies */}
      {profile.targetCompanies.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle>Target Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.targetCompanies.map((company) => (
                <Badge
                  key={company}
                  className="bg-indigo-950 text-indigo-300 border-indigo-800"
                >
                  {company}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prep Areas */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle>Your Prep Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: "Python", id: "PYTHON" },
              { name: "SQL", id: "SQL" },
              { name: "System Design", id: "SYSTEM_DESIGN" },
              { name: "Data Modeling", id: "DATA_MODELING" },
              { name: "Culture Fit", id: "CULTURE_FIT" },
            ].map((area) => {
              const isStrength = profile.strengths.includes(area.id);
              const isWeakness = profile.weaknesses.includes(area.id);

              return (
                <div
                  key={area.name}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/50 text-center"
                >
                  <p className="font-medium mb-2">{area.name}</p>
                  {isStrength && (
                    <Badge className="bg-green-950 text-green-400 border-green-800">
                      Strength
                    </Badge>
                  )}
                  {isWeakness && (
                    <Badge className="bg-red-950 text-red-400 border-red-800">
                      Needs Work
                    </Badge>
                  )}
                  {!isStrength && !isWeakness && (
                    <Badge variant="secondary" className="bg-slate-800 text-slate-400">
                      0% complete
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

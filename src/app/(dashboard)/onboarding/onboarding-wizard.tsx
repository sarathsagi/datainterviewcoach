"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  Gauge,
  Clock,
  Brain,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  { title: "Your Goals", icon: Building2 },
  { title: "Experience Level", icon: Gauge },
  { title: "Daily Commitment", icon: Clock },
  { title: "Focus Areas", icon: Brain },
];

const POPULAR_COMPANIES = [
  "Google", "Meta", "Amazon", "Apple", "Microsoft",
  "Netflix", "Uber", "Airbnb", "Stripe", "Snowflake",
  "Databricks", "dbt Labs", "Confluent", "Palantir", "Coinbase",
];

const TOPIC_AREAS = [
  { id: "PYTHON", label: "Python Coding", category: "strengths" as const },
  { id: "SQL", label: "SQL & Query Optimization", category: "strengths" as const },
  { id: "SYSTEM_DESIGN", label: "System Design & Pipelines", category: "strengths" as const },
  { id: "DATA_MODELING", label: "Data Modeling & Schema Design", category: "strengths" as const },
  { id: "CULTURE_FIT", label: "Behavioral / Culture Fit", category: "strengths" as const },
];

interface OnboardingWizardProps {
  userName: string;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);

  function addCompany(company: string) {
    const trimmed = company.trim();
    if (trimmed && !targetCompanies.includes(trimmed) && targetCompanies.length < 10) {
      setTargetCompanies([...targetCompanies, trimmed]);
    }
    setCompanyInput("");
  }

  function removeCompany(company: string) {
    setTargetCompanies(targetCompanies.filter((c) => c !== company));
  }

  function toggleTopic(topicId: string, list: "strengths" | "weaknesses") {
    if (list === "strengths") {
      if (strengths.includes(topicId)) {
        setStrengths(strengths.filter((s) => s !== topicId));
      } else {
        setStrengths([...strengths, topicId]);
        setWeaknesses(weaknesses.filter((w) => w !== topicId));
      }
    } else {
      if (weaknesses.includes(topicId)) {
        setWeaknesses(weaknesses.filter((w) => w !== topicId));
      } else {
        setWeaknesses([...weaknesses, topicId]);
        setStrengths(strengths.filter((s) => s !== topicId));
      }
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return true; // Companies and date are optional
      case 1: return !!skillLevel;
      case 2: return hoursPerDay >= 0.5 && hoursPerDay <= 12;
      case 3: return true; // Focus areas optional
      default: return false;
    }
  }

  async function handleFinish() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompanies,
          interviewDate: interviewDate || null,
          skillLevel,
          hoursPerDay,
          strengths,
          weaknesses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/80 backdrop-blur">
      <CardHeader className="text-center space-y-4 pb-2">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i < step
                    ? "bg-indigo-600 text-white"
                    : i === step
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    i < step ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <CardTitle className="text-2xl text-white">
          {step === 0 && `Welcome, ${userName.split(" ")[0]}! Let's set up your prep plan.`}
          {step === 1 && "What's your experience level?"}
          {step === 2 && "How much time can you dedicate daily?"}
          {step === 3 && "What are your strengths and weaknesses?"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Step 0: Goals */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-slate-300">Target Companies (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCompany(companyInput);
                    }
                  }}
                  placeholder="Type a company name and press Enter"
                  className="border-slate-700 bg-slate-800 text-white"
                />
              </div>

              {/* Popular companies */}
              <div className="flex flex-wrap gap-2">
                {POPULAR_COMPANIES.filter((c) => !targetCompanies.includes(c)).map((company) => (
                  <button
                    key={company}
                    onClick={() => addCompany(company)}
                    className="px-3 py-1 text-xs rounded-full border border-slate-700 text-slate-400 hover:border-indigo-600 hover:text-indigo-400 transition-colors"
                  >
                    + {company}
                  </button>
                ))}
              </div>

              {/* Selected companies */}
              {targetCompanies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {targetCompanies.map((company) => (
                    <Badge
                      key={company}
                      className="bg-indigo-950 text-indigo-300 border-indigo-800 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition-colors"
                      onClick={() => removeCompany(company)}
                    >
                      {company} &times;
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewDate" className="text-slate-300">
                <Calendar className="h-4 w-4 inline mr-1" />
                Interview Date (optional)
              </Label>
              <Input
                id="interviewDate"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="border-slate-700 bg-slate-800 text-white max-w-xs [color-scheme:dark]"
              />
              {interviewDate && (
                <p className="text-xs text-slate-500">
                  {Math.ceil(
                    (new Date(interviewDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days from now
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Skill Level */}
        {step === 1 && (
          <div className="grid gap-3">
            {[
              {
                level: "BEGINNER",
                title: "Beginner",
                desc: "New to data engineering interviews. Need to build fundamentals in Python, SQL, and system design.",
              },
              {
                level: "INTERMEDIATE",
                title: "Intermediate",
                desc: "Some experience with data engineering concepts. Comfortable with basic Python and SQL but need practice with system design and optimization.",
              },
              {
                level: "ADVANCED",
                title: "Advanced",
                desc: "Strong foundation in data engineering. Looking to sharpen edge cases, advanced system design, and company-specific prep.",
              },
            ].map((option) => (
              <button
                key={option.level}
                onClick={() => setSkillLevel(option.level)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  skillLevel === option.level
                    ? "border-indigo-600 bg-indigo-950/30"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{option.title}</span>
                  {skillLevel === option.level && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                  )}
                </div>
                <p className="text-sm text-slate-400">{option.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Hours per Day */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-indigo-400 mb-2">
                {hoursPerDay}
              </div>
              <p className="text-slate-400">hours per day</p>
            </div>

            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />

            <div className="flex justify-between text-xs text-slate-500">
              <span>30 min</span>
              <span>4 hrs</span>
              <span>8 hrs</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  onClick={() => setHoursPerDay(h)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    hoursPerDay === h
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {h} hr{h > 1 ? "s" : ""}
                </button>
              ))}
            </div>

            {interviewDate && (
              <p className="text-center text-sm text-slate-400">
                With {hoursPerDay} hrs/day, you&apos;ll get ~
                {Math.round(
                  hoursPerDay *
                    Math.ceil(
                      (new Date(interviewDate).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                )}{" "}
                total hours of prep before your interview.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Strengths & Weaknesses */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Mark each area as a strength or weakness so we can personalize your study plan. Skip any you&apos;re unsure about.
            </p>

            <div className="space-y-3">
              {TOPIC_AREAS.map((topic) => {
                const isStrength = strengths.includes(topic.id);
                const isWeakness = weaknesses.includes(topic.id);

                return (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/50"
                  >
                    <span className="font-medium text-sm">{topic.label}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleTopic(topic.id, "strengths")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          isStrength
                            ? "bg-green-900 text-green-400 border border-green-700"
                            : "bg-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        Strength
                      </button>
                      <button
                        onClick={() => toggleTopic(topic.id, "weaknesses")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          isWeakness
                            ? "bg-red-900 text-red-400 border border-red-700"
                            : "bg-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        Weakness
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              onClick={handleFinish}
              disabled={loading || !canProceed()}
            >
              {loading ? "Setting up..." : "Start Prepping"}
              {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

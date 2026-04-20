"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarkReadButtonProps {
  moduleId: string;
  pathId: string;
  initialCompleted: boolean;
}

export function MarkReadButton({ moduleId, pathId, initialCompleted }: MarkReadButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const newState = !completed;
    setCompleted(newState);

    await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, pathId, completed: newState }),
    });

    setLoading(false);
  }

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={completed ? "outline" : "default"}
      className={
        completed
          ? "border-green-700/50 bg-green-900/20 text-green-400 hover:bg-green-900/30 gap-2"
          : "bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
      }
    >
      {completed ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Marked as Read
        </>
      ) : (
        <>
          <Circle className="h-4 w-4" />
          Mark as Read
        </>
      )}
    </Button>
  );
}

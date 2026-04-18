"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

interface ModuleCheckboxProps {
  moduleId: string;
  pathId: string;
  initialCompleted: boolean;
}

export function ModuleCheckbox({ moduleId, pathId, initialCompleted }: ModuleCheckboxProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const newState = !completed;
    setCompleted(newState); // optimistic update

    try {
      const res = await fetch("/api/learn/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, pathId, completed: newState }),
      });

      if (!res.ok) {
        // Revert on error
        setCompleted(!newState);
      } else {
        // Refresh server data without full reload
        startTransition(() => router.refresh());
      }
    } catch {
      setCompleted(!newState);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`flex-shrink-0 mt-0.5 transition-all ${
        isPending ? "opacity-50" : "hover:scale-110"
      }`}
      title={completed ? "Mark as unread" : "Mark as read"}
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-400" />
      ) : (
        <Circle className="h-5 w-5 text-slate-600 hover:text-indigo-400 transition-colors" />
      )}
    </button>
  );
}

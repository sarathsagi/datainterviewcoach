"use client";

import { checkPasswordStrength, type PasswordStrength } from "@/lib/password";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = checkPasswordStrength(password);

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength.score ? strength.color : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs ${
          strength.score <= 1
            ? "text-red-400"
            : strength.score === 2
              ? "text-yellow-400"
              : strength.score === 3
                ? "text-blue-400"
                : "text-green-400"
        }`}
      >
        {strength.label}
      </p>

      {/* Checklist */}
      {password.length > 0 && strength.score < 4 && (
        <ul className="space-y-0.5 text-xs">
          <CheckItem ok={strength.checks.minLength} text="At least 8 characters" />
          <CheckItem ok={strength.checks.hasUppercase} text="One uppercase letter" />
          <CheckItem ok={strength.checks.hasLowercase} text="One lowercase letter" />
          <CheckItem ok={strength.checks.hasNumber} text="One number" />
          <CheckItem ok={strength.checks.hasSpecial} text="One special character" />
        </ul>
      )}
    </div>
  );
}

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={ok ? "text-slate-500" : "text-slate-500"}>
      <span className={ok ? "text-green-400" : "text-slate-600"}>
        {ok ? "\u2713" : "\u2022"}
      </span>{" "}
      <span className={ok ? "text-slate-400" : ""}>{text}</span>
    </li>
  );
}

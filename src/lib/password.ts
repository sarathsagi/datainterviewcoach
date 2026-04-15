/**
 * Password validation and strength checking utilities.
 */

export interface PasswordStrength {
  score: number; // 0-4
  label: "Weak" | "Fair" | "Good" | "Strong";
  color: string; // tailwind color class
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;

  if (passed <= 1) return { score: 0, label: "Weak", color: "bg-red-500", checks };
  if (passed === 2) return { score: 1, label: "Weak", color: "bg-red-500", checks };
  if (passed === 3) return { score: 2, label: "Fair", color: "bg-yellow-500", checks };
  if (passed === 4) return { score: 3, label: "Good", color: "bg-blue-500", checks };
  return { score: 4, label: "Strong", color: "bg-green-500", checks };
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  const strength = checkPasswordStrength(password);
  if (strength.score < 2) {
    return "Password is too weak. Include uppercase, lowercase, numbers, and special characters.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  return null;
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.trim().length > 100) return "Name must be less than 100 characters";
  return null;
}

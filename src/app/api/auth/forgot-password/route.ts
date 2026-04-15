import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePasswordResetToken } from "@/lib/tokens";
import { validateEmail } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterSeconds } = checkRateLimit(ip, "forgot-password");
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }
    const { email } = await request.json();

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({
        message: "If an account exists with that email, you will receive a password reset link.",
      });
    }

    const resetToken = await generatePasswordResetToken(normalizedEmail);

    // Build the reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken.token}`;

    await sendPasswordResetEmail(normalizedEmail, user.name || "", resetUrl);

    return NextResponse.json({
      message: "If an account exists with that email, you will receive a password reset link.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

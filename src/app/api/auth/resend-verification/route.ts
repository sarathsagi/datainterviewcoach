import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmailVerificationToken } from "@/lib/tokens";
import { sendEmailVerification } from "@/lib/email";
import { validateEmail } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterSeconds } = checkRateLimit(ip, "forgot-password"); // reuse same limit
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
    if (!user || user.emailVerified) {
      return NextResponse.json({
        message: "If an unverified account exists with that email, a new verification link has been sent.",
      });
    }

    const verificationToken = await generateEmailVerificationToken(normalizedEmail);
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.datainterviewcoach.com";
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken.token}`;

    await sendEmailVerification(normalizedEmail, user.name || "", verifyUrl);

    return NextResponse.json({
      message: "If an unverified account exists with that email, a new verification link has been sent.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

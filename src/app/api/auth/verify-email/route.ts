import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeEmailVerificationToken } from "@/lib/tokens";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    const verificationToken = await consumeEmailVerificationToken(token);

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired verification link. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark the user's email as verified
    const user = await prisma.user.update({
      where: { email: verificationToken.email },
      data: { emailVerified: new Date() },
    });

    // Send welcome email now that they're verified (non-blocking)
    sendWelcomeEmail(verificationToken.email, user.name || "").catch((err) =>
      console.error("Failed to send welcome email:", err)
    );

    return NextResponse.json({
      message: "Email verified successfully! You can now sign in.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

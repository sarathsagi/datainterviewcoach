import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/tokens";
import { validatePassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const resetToken = await consumePasswordResetToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: "Password has been reset successfully. You can now sign in.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

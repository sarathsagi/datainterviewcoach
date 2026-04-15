import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      targetCompanies,
      interviewDate,
      skillLevel,
      hoursPerDay,
      strengths,
      weaknesses,
    } = body;

    // Validate required fields
    if (!skillLevel || !hoursPerDay) {
      return NextResponse.json(
        { error: "Skill level and hours per day are required" },
        { status: 400 }
      );
    }

    if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(skillLevel)) {
      return NextResponse.json(
        { error: "Invalid skill level" },
        { status: 400 }
      );
    }

    if (hoursPerDay < 0.5 || hoursPerDay > 12) {
      return NextResponse.json(
        { error: "Hours per day must be between 0.5 and 12" },
        { status: 400 }
      );
    }

    await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        targetCompanies: targetCompanies ?? [],
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        skillLevel,
        hoursPerDay: parseFloat(hoursPerDay),
        strengths: strengths ?? [],
        weaknesses: weaknesses ?? [],
        onboardingDone: true,
      },
      update: {
        targetCompanies: targetCompanies ?? [],
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        skillLevel,
        hoursPerDay: parseFloat(hoursPerDay),
        strengths: strengths ?? [],
        weaknesses: weaknesses ?? [],
        onboardingDone: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

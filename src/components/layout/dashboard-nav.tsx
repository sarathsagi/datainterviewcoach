"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Brain, LogOut, User } from "lucide-react";

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg">Data Interview Coach</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative h-9 w-9 rounded-full cursor-pointer"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback className="bg-indigo-600 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 border-slate-800 bg-slate-900 text-white"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              className="text-red-400 focus:bg-slate-800 focus:text-red-300 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

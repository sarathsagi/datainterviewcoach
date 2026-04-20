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
import Image from "next/image";
import {
  LogOut,
  Settings,
  User,
  BookOpen,
  LayoutDashboard,
  Code2,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn",     label: "Learn",     icon: BookOpen },
  { href: "/practice",  label: "Practice",  icon: Code2 },
  { href: "/quiz",      label: "Quiz",      icon: Zap },
];

export default function DashboardNav({ user }: DashboardNavProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "U";

  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 h-14"
      style={{
        background: "oklch(0.055 0.002 280 / 80%)",
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        borderBottom: "1px solid oklch(1 0 0 / 7%)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center flex-shrink-0">
          <Image
            src="/logo-full.svg"
            alt="Data Interview Coach"
            width={210}
            height={36}
            priority
          />
        </Link>

        {/* Desktop nav — centered pill group */}
        <div className="hidden sm:flex items-center gap-0.5 flex-1 justify-center">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/50 hover:text-white/90 hover:bg-white/6"
                }`}
              >
                <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Avatar / dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full cursor-pointer flex-shrink-0 ring-2 ring-transparent hover:ring-white/20 transition-all duration-150">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback
                className="text-xs font-semibold"
                style={{ background: "oklch(0.50 0.24 264)", color: "white" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 mt-1"
            style={{
              background: "oklch(0.12 0.003 280 / 95%)",
              backdropFilter: "blur(24px)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            {/* User info */}
            <div className="px-3 py-2 border-b border-white/8">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-white/40 mt-0.5 truncate">{user.email}</p>
            </div>

            {/* Mobile nav links */}
            <div className="sm:hidden py-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} className="p-0 focus:bg-white/8">
                    <Link
                      href={item.href}
                      className={`flex items-center w-full px-3 py-2 gap-2.5 text-sm ${
                        isActive ? "text-white" : "text-white/60"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="bg-white/8 my-1" />
            </div>

            {/* Account actions */}
            <div className="py-1">
              <DropdownMenuItem className="p-0 focus:bg-white/8">
                <Link href="/settings" className="flex items-center w-full px-3 py-2 gap-2.5 text-sm text-white/70 hover:text-white">
                  <User className="h-4 w-4" />
                  Profile & Settings
                </Link>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-white/8 my-0" />

            <div className="py-1">
              <DropdownMenuItem
                className="px-3 py-2 gap-2.5 text-sm text-red-400 focus:bg-white/8 focus:text-red-300 cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </nav>
  );
}

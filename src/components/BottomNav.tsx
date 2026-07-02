"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  House,
  CirclePlus,
  MessageCircle,
  Menu,
  History,
  Camera,
  Target,
  CalendarCheck,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/log", label: "Log", icon: CirclePlus },
  { href: "/chat", label: "Coach", icon: MessageCircle },
] as const;

const moreLinks = [
  { href: "/history", label: "History", icon: History },
  { href: "/photos", label: "Progress photos", icon: Camera },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/plan", label: "Training plan", icon: CalendarCheck },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreLinks.some((l) => pathname.startsWith(l.href));

  return (
    <nav className="bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-xs font-medium transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Menu className="size-5" />
            More
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid gap-1 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {moreLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
                >
                  <Icon className="text-muted-foreground size-5" />
                  {label}
                </Link>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors"
              >
                <LogOut className="text-muted-foreground size-5" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

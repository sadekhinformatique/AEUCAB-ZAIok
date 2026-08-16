"use client"

import {
  LayoutDashboard, BarChart3, Search, Users, UserPlus, CreditCard, Smartphone,
  Wallet, ReceiptText, BookOpen, Landmark, TrendingDown, CalendarDays, UsersRound,
  ClipboardCheck, Vote, CheckSquare, FolderArchive, Boxes, GraduationCap, Library,
  Handshake, Archive, Bell, ArrowUpDown, ShieldCheck, ScrollText, RefreshCw, Trophy,
  LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, BarChart3, Search, Users, UserPlus, CreditCard, Smartphone,
  Wallet, ReceiptText, BookOpen, Landmark, TrendingDown, CalendarDays, UsersRound,
  ClipboardCheck, Vote, CheckSquare, FolderArchive, Boxes, GraduationCap, Library,
  Handshake, Archive, Bell, ArrowUpDown, ShieldCheck, ScrollText, RefreshCw, Trophy,
}

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard
  return <Cmp className={className} />
}

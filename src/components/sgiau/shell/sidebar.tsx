"use client"

import { useRef, useState } from "react"
import { MODULE_GROUPS, APP_NAME, UCAB_FULL_NAME } from "@/lib/sgiau/constants"
import { useSgiau } from "@/lib/sgiau/store"
import { Icon } from "./icon"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronRight, X } from "lucide-react"
import { Drawer, DrawerContent } from "@/components/ui/drawer"

export function Sidebar() {
  const { activeModule, setModule, sidebarOpen, setSidebarOpen } = useSgiau()
  const navRef = useRef<HTMLElement | null>(null)
  // Sections repliées/dépliées : par défaut tout est déplié
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  function toggleGroup(group: string) {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  function openModule(id: string, group: string) {
    setModule(id)
    // Déplie la section quand on active un module
    setCollapsed((prev) => (prev[group] ? { ...prev, [group]: false } : prev))
  }

  // Keyboard navigation: ArrowUp/ArrowDown move between items, Home/End jump to first/last
  function handleNavKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    const buttons = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])
    if (buttons.length === 0) return
    const idx = buttons.findIndex((b) => b === document.activeElement)
    if (idx === -1) return
    let next: HTMLButtonElement | null = null
    if (e.key === "ArrowDown") {
      e.preventDefault()
      next = buttons[(idx + 1) % buttons.length]
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      next = buttons[(idx - 1 + buttons.length) % buttons.length]
    } else if (e.key === "Home") {
      e.preventDefault()
      next = buttons[0]
    } else if (e.key === "End") {
      e.preventDefault()
      next = buttons[buttons.length - 1]
    }
    next?.focus()
  }

  const content = (
    <>
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white p-0.5 ring-2 ring-sidebar-primary/70">
          <img src="/logo-aeucab.png" alt="Logo de l'amicale" className="h-full w-full rounded-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="font-bold tracking-tight leading-none">{APP_NAME}</p>
          <p className="text-[11px] text-sidebar-foreground/60 truncate mt-1">{UCAB_FULL_NAME}</p>
        </div>
        <button
          className="ml-auto lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0 scroll-thin overscroll-contain">
        <nav ref={navRef} onKeyDown={handleNavKeyDown} className="px-3 py-4 space-y-5">
          {MODULE_GROUPS.map((group) => {
            const isCollapsed = !!collapsed[group.group]
            return (
              <div key={group.group}>
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors text-left rounded-md"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{group.group}</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.modules.map((m) => {
                      const active = activeModule === m.id
                      return (
                        <button
                          key={m.id}
                          onClick={() => openModule(m.id, group.group)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon name={m.icon} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
        <p className="font-medium text-sidebar-foreground/70">{APP_NAME} v1.0</p>
        <p className="mt-0.5 leading-relaxed">Next.js · PostgreSQL · Neon</p>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar — static */}
      <aside className="hidden lg:sticky lg:flex top-0 h-screen w-72 shrink-0 bg-sidebar text-sidebar-foreground flex-col overflow-hidden">
        {content}
      </aside>

      {/* Mobile drawer — vaul: 1:1 drag tracking, momentum projection, velocity handoff */}
      <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
        <DrawerContent className="w-72! bg-sidebar! text-sidebar-foreground lg:hidden overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    </>
  )
}

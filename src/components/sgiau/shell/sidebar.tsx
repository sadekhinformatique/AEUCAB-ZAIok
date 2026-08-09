"use client"

import { MODULE_GROUPS, APP_NAME, APP_FULL_NAME } from "@/lib/sgiau/constants"
import { useSgiau } from "@/lib/sgiau/store"
import { Icon } from "./icon"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GraduationCap, X } from "lucide-react"

export function Sidebar() {
  const { activeModule, setModule, sidebarOpen, setSidebarOpen } = useSgiau()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed lg:sticky top-0 z-50 lg:z-auto h-screen w-72 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground p-2">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold tracking-tight leading-none">{APP_NAME}</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate mt-1">Amicale Universitaire</p>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 scroll-thin">
          <nav className="px-3 py-4 space-y-5">
            {MODULE_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.group}
                </p>
                <div className="space-y-0.5">
                  {group.modules.map((m) => {
                    const active = activeModule === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setModule(m.id)}
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
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
          <p className="font-medium text-sidebar-foreground/70">{APP_NAME} v1.0</p>
          <p className="mt-0.5 leading-relaxed">Next.js · PostgreSQL · Neon</p>
        </div>
      </aside>
    </>
  )
}

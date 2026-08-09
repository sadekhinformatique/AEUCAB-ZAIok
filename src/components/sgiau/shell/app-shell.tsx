"use client"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { ModuleRenderer } from "../modules/registry"
import { useSgiau } from "@/lib/sgiau/store"
import { APP_FULL_NAME } from "@/lib/sgiau/constants"
import { GraduationCap, Heart } from "lucide-react"

export function AppShell() {
  const { activeModule } = useSgiau()
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">
          <ModuleRenderer moduleId={activeModule} />
        </main>
        <footer className="mt-auto border-t bg-background">
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="font-medium">{APP_FULL_NAME}</span>
            </div>
            <div className="flex items-center gap-1">
              Conçu avec <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> pour les amicales universitaires · v1.0
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

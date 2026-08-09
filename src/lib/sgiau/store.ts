"use client"

import { create } from "zustand"

interface SgiauState {
  activeModule: string
  searchQuery: string
  sidebarOpen: boolean
  setModule: (id: string) => void
  setSearch: (q: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useSgiau = create<SgiauState>((set) => ({
  activeModule: "dashboard",
  searchQuery: "",
  sidebarOpen: false,
  setModule: (id) => set({ activeModule: id, sidebarOpen: false, searchQuery: "" }),
  setSearch: (q) => set({ searchQuery: q }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

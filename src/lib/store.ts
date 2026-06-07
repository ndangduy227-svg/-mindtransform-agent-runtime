"use client"

import { createContext, useContext } from "react"
import type { Agent } from "./data"

export type AppState = {
  agents: Agent[]
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  deleteAgent: (id: string) => void
}

export const AppContext = createContext<AppState>(null!)

export function useApp() {
  return useContext(AppContext)
}

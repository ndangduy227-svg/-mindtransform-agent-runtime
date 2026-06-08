"use client"

import { useState, useEffect, useCallback } from "react"

/* eslint-disable @typescript-eslint/no-explicit-any */

export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || "Unknown error")
    }
    setLoading(false)
  }, [url])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useMutate<T = any>(url: string, method: string = "POST") {
  const [loading, setLoading] = useState(false)

  const mutate = useCallback(async (body?: any): Promise<T | null> => {
    setLoading(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLoading(false)
      return json as T
    } catch {
      setLoading(false)
      return null
    }
  }, [url, method])

  return { mutate, loading }
}

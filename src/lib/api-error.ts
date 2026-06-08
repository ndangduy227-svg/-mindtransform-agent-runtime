// Supabase errors are plain objects with { message, code, details, hint }
// This helper extracts a readable message from any caught error.
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>
    if (typeof obj.message === "string") return obj.message
    if (typeof obj.error === "string") return obj.error
    try { return JSON.stringify(e) } catch { return "Unknown object error" }
  }
  return String(e)
}

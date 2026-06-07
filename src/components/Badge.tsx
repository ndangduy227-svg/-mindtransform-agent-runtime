"use client"

const colorMap: Record<string, string> = {
  green: "bg-green-soft text-green border-[#c7e6d2]",
  blue: "bg-blue-soft text-blue border-[#cbdcf0]",
  amber: "bg-amber-soft text-amber border-[#ead7a9]",
  red: "bg-red-soft text-red border-[#ebc8c3]",
  violet: "bg-violet-soft text-violet border-[#dccfed]",
  gray: "bg-[#f0f2f0] text-[#5d6861] border-line",
}

export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs whitespace-nowrap border ${colorMap[color] || colorMap.gray}`}>
      {children}
    </span>
  )
}

export function statusBadgeColor(status: string) {
  if (status === "production" || status === "Qualified" || status === "Done") return "green"
  if (status === "draft" || status === "Review" || status === "Waiting") return "amber"
  if (status === "Needs info") return "blue"
  return "gray"
}

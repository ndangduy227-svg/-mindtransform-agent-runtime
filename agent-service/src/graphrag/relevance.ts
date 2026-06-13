const STOP_WORDS = new Set([
  "cua", "cho", "voi", "cac", "mot", "nhung", "trong", "theo", "and", "the", "for",
  "nganh", "van", "hanh", "quan", "ly", "khach", "hang", "doanh", "nghiep", "he",
  "thong", "trien", "khai", "thiet", "ke", "giai", "phap", "nhu", "cau", "quy", "trinh",
]);

const DOMAIN_SIGNALS = {
  automotive: ["xe tai", "garage", "dan lanh", "thung xe", "vat tu garage", "qc ban giao", "kiotviet"],
  spa: ["spa", "lieu trinh", "lich hen", "cham soc da", "tham my", "chi nhanh spa"],
};

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function domainHits(value: string, signals: string[]): number {
  const text = normalized(value);
  return signals.filter((signal) => text.includes(signal)).length;
}

function keywords(value: string): Set<string> {
  return new Set(
    normalized(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
}

/** Deterministic guard against cross-domain GraphRAG prompt contamination. */
export function contextRelevance(query: string, context: string): number {
  if (!context.trim()) return 0;
  const queryAutomotive = domainHits(query, DOMAIN_SIGNALS.automotive);
  const querySpa = domainHits(query, DOMAIN_SIGNALS.spa);
  const contextAutomotive = domainHits(context, DOMAIN_SIGNALS.automotive);
  const contextSpa = domainHits(context, DOMAIN_SIGNALS.spa);
  if (queryAutomotive >= 2 && contextAutomotive === 0) return 0;
  if (querySpa >= 2 && contextSpa === 0) return 0;
  if (queryAutomotive >= 2 && contextSpa >= 2 && contextAutomotive < 2) return 0;
  if (querySpa >= 2 && contextAutomotive >= 2 && contextSpa < 2) return 0;

  const queryWords = keywords(query);
  const contextWords = keywords(context);
  if (!queryWords.size) return 0;
  let overlap = 0;
  for (const word of queryWords) {
    if (contextWords.has(word)) overlap++;
  }
  return overlap / queryWords.size;
}

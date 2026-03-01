// landing/src/components/forum/categories.ts
// Forum category definitions — shared between components

export const CATEGORIES = [
  { slug: "bendri-klausimai", title: "Bendri klausimai", color: "#f59e0b" },
  { slug: "technine-pagalba", title: "Technin\u0117 pagalba", color: "#ea580c" },
  { slug: "pirkimu-diskusijos", title: "Vie\u0161\u0173j\u0173 pirkim\u0173 diskusijos", color: "#3b82f6" },
  { slug: "idejus-pasiulymai", title: "Id\u0117jos ir pasi\u016blymai", color: "#f59e0b" },
  { slug: "sekmingos-analizes", title: "S\u0117kmingos analiz\u0117s", color: "#22c55e" },
] as const;

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryTitle(slug: string) {
  return getCategoryBySlug(slug)?.title ?? slug;
}

export function getCategoryColor(slug: string) {
  return getCategoryBySlug(slug)?.color ?? "#f59e0b";
}

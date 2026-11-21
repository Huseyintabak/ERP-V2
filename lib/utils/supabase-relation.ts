/**
 * Supabase (PostgREST) ilişki alanını tek kayda indirger.
 *
 * Çoka-bir join'lerde (örn. `product:finished_products(...)`) PostgREST runtime'da tek obje
 * döner; ancak projede üretilmiş DB tipleri olmadığından supabase-js bu alanları dizi olarak
 * tipler. Bu yardımcı her iki biçimi de doğru ele alır.
 */
export function relationOne<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

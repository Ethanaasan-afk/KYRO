import type { CategoryTree } from "@/lib/business-types";
import type { ProductCategoryRow } from "@/lib/types";

export type SubcategoryNode = {
  name: string;
  /** Row id when the shop created it (deletable); undefined for built-in / in-use names */
  id?: string;
  builtIn: boolean;
  productCount: number;
};

export type CategoryNode = {
  name: string;
  id?: string;
  builtIn: boolean;
  productCount: number;
  subcategories: SubcategoryNode[];
};

const key = (s: string) => s.trim().toLowerCase();

/**
 * One tree for pickers and filters: built-in categories for the business type,
 * then the shop's own categories, then any names already used on products
 * (so older catalogs never lose a category).
 */
export function buildCategoryTree(input: {
  defaults: CategoryTree;
  custom?: ProductCategoryRow[];
  products?: { category?: string | null; subcategory?: string | null }[];
}): CategoryNode[] {
  const nodes: CategoryNode[] = [];
  const byKey = new Map<string, CategoryNode>();

  const ensure = (name: string, builtIn: boolean, id?: string): CategoryNode | null => {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    const k = key(trimmed);
    let node = byKey.get(k);
    if (!node) {
      node = { name: trimmed, builtIn, id, productCount: 0, subcategories: [] };
      byKey.set(k, node);
      nodes.push(node);
    } else if (id && !node.id) {
      node.id = id;
    }
    return node;
  };

  const ensureSub = (node: CategoryNode, name: string, builtIn: boolean, id?: string) => {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    let sub = node.subcategories.find((x) => key(x.name) === key(trimmed));
    if (!sub) {
      sub = { name: trimmed, builtIn, id, productCount: 0 };
      node.subcategories.push(sub);
    } else if (id && !sub.id) {
      sub.id = id;
    }
    return sub;
  };

  for (const [cat, subs] of Object.entries(input.defaults)) {
    const node = ensure(cat, true);
    if (!node) continue;
    for (const s of subs) ensureSub(node, s, true);
  }

  const custom = [...(input.custom ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );
  const rowsById = new Map(custom.map((r) => [r.id, r]));
  for (const row of custom.filter((r) => !r.parent_id)) ensure(row.name, false, row.id);
  for (const row of custom.filter((r) => r.parent_id)) {
    const parent = rowsById.get(row.parent_id!);
    if (!parent) continue;
    const node = ensure(parent.name, false, parent.id);
    if (node) ensureSub(node, row.name, false, row.id);
  }

  for (const p of input.products ?? []) {
    const node = ensure(p.category ?? "", false);
    if (!node) continue;
    node.productCount += 1;
    if (p.subcategory?.trim()) {
      const sub = ensureSub(node, p.subcategory, false);
      if (sub) sub.productCount += 1;
    }
  }

  return nodes;
}

export function findCategory(tree: CategoryNode[], name: string | null | undefined) {
  if (!name) return undefined;
  return tree.find((n) => key(n.name) === key(name));
}

export function subcategoryNames(tree: CategoryNode[], category: string | null | undefined): string[] {
  return findCategory(tree, category)?.subcategories.map((s) => s.name) ?? [];
}

/** "Vegetables › Leafy greens" */
export function categoryPath(category?: string | null, subcategory?: string | null): string {
  const c = category?.trim() ?? "";
  const s = subcategory?.trim() ?? "";
  return s ? `${c} › ${s}` : c;
}

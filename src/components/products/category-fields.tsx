"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCategoryTree, useProductCategoryMutations } from "@/hooks/use-product-categories";
import { findCategory } from "@/lib/categories";
import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

const NEW = "__new__";
const NONE = "";

/**
 * Category + subcategory pickers. Both lists come from the business type's
 * built-in tree, the shop's own categories and names already used on products.
 * "+ New…" adds one inline (and saves it to the shop's category list).
 */
export function CategoryFields({
  category,
  subcategory,
  onCategory,
  onSubcategory,
  showSubcategory = true,
  error,
}: {
  category: string;
  subcategory: string;
  onCategory: (value: string) => void;
  onSubcategory: (value: string) => void;
  showSubcategory?: boolean;
  error?: string;
}) {
  const { tree } = useCategoryTree();
  const { upsert } = useProductCategoryMutations();
  const { toast } = useToast();
  const [adding, setAdding] = useState<"category" | "subcategory" | null>(null);
  const [draft, setDraft] = useState("");

  const categoryOptions = useMemo(() => {
    const names = tree.map((n) => n.name);
    if (category && !names.some((n) => n.toLowerCase() === category.toLowerCase())) names.unshift(category);
    return [
      ...names.map((n) => ({ value: n, label: n })),
      { value: NEW, label: "+ New category…" },
    ];
  }, [tree, category]);

  const node = findCategory(tree, category);
  const subOptions = useMemo(() => {
    const names = node?.subcategories.map((s) => s.name) ?? [];
    if (subcategory && !names.some((n) => n.toLowerCase() === subcategory.toLowerCase())) names.unshift(subcategory);
    return [
      { value: NONE, label: names.length ? "No subcategory" : "None yet" },
      ...names.map((n) => ({ value: n, label: n })),
      { value: NEW, label: "+ New subcategory…" },
    ];
  }, [node, subcategory]);

  const save = async () => {
    const name = draft.trim();
    if (!name) return;
    const kind = adding;
    setAdding(null);
    setDraft("");
    if (kind === "category") {
      onCategory(name);
      onSubcategory("");
      if (!findCategory(tree, name)) {
        upsert.mutate(
          { name },
          { onError: () => toast(`"${name}" will be saved with this product.`, "info") }
        );
      }
    } else if (kind === "subcategory") {
      onSubcategory(name);
      const parent = findCategory(tree, category);
      if (parent?.id && !parent.subcategories.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        upsert.mutate({ name, parent_id: parent.id });
      } else if (!parent?.id) {
        // Parent is a built-in name: create it as the shop's own so the subcategory can hang off it
        upsert.mutate(
          { name: category },
          {
            onSuccess: (row) => upsert.mutate({ name, parent_id: row.id }),
            onError: () => undefined,
          }
        );
      }
    }
  };

  const inline = (label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <span className="field-label">{label}</span>
      <div className="flex gap-2">
        <Input
          autoFocus
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setAdding(null);
            }
          }}
        />
        <button
          type="button"
          onClick={() => void save()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white transition-transform active:scale-95"
          aria-label="Add"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setAdding(null)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-border text-slate hover:text-ink"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {adding === "category" ? (
        inline("New category", "e.g. Vegetables")
      ) : (
        <Select
          label="Category"
          options={categoryOptions}
          value={category}
          error={error}
          onChange={(e) => {
            if (e.target.value === NEW) {
              setDraft("");
              setAdding("category");
              return;
            }
            onCategory(e.target.value);
            onSubcategory("");
          }}
        />
      )}
      {showSubcategory &&
        (adding === "subcategory" ? (
          inline("New subcategory", "e.g. Leafy greens")
        ) : (
          <div className="space-y-1.5">
            <Select
              label="Subcategory (optional)"
              options={subOptions}
              value={subcategory}
              disabled={!category}
              onChange={(e) => {
                if (e.target.value === NEW) {
                  setDraft("");
                  setAdding("subcategory");
                  return;
                }
                onSubcategory(e.target.value);
              }}
            />
            {node && node.subcategories.length > 0 && !subcategory ? (
              <div className="flex flex-wrap gap-1.5">
                {node.subcategories.slice(0, 6).map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => onSubcategory(s.name)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-cloud px-2.5 py-1 text-[11px] font-medium text-slate transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    {s.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
    </>
  );
}

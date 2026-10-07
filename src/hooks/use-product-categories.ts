"use client";

import { useAuth } from "@/components/auth-provider";
import { useBusinessType } from "@/hooks/use-business-type";
import { useProducts } from "@/hooks/use-products";
import { buildCategoryTree, type CategoryNode } from "@/lib/categories";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { ProductCategoryRow } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

const MISSING_TABLE = /product_categories|schema cache|does not exist|relation/i;

async function fetchCategoryRows(): Promise<ProductCategoryRow[]> {
  if (isDemoMode()) return demoDb.getProductCategories();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) {
    // Before migration 038 the table does not exist: fall back to built-in + in-use names.
    if (MISSING_TABLE.test(error.message)) return [];
    throw error;
  }
  return (data ?? []) as ProductCategoryRow[];
}

export function useProductCategoryRows() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["product_categories"],
    enabled: !loading && !!user,
    queryFn: fetchCategoryRows,
  });
}

/** Built-in categories for the business type + the shop's own + names used on products. */
export function useCategoryTree(): { tree: CategoryNode[]; isLoading: boolean } {
  const { config } = useBusinessType();
  const rows = useProductCategoryRows();
  const products = useProducts();
  const tree = useMemo(
    () =>
      buildCategoryTree({
        defaults: config.categoryTree,
        custom: rows.data ?? [],
        products: products.data ?? [],
      }),
    [config.categoryTree, rows.data, products.data]
  );
  return { tree, isLoading: rows.isLoading || products.isLoading };
}

export function useProductCategoryMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["product_categories"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const upsert = useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      parent_id?: string | null;
      /** Previous name - products using it are renamed along with the category */
      previousName?: string;
      /** Parent category name (when renaming a subcategory) */
      parentName?: string;
    }) => {
      const name = input.name.trim();
      if (!name) throw new Error("Give it a name first.");
      if (isDemoMode()) return demoDb.upsertProductCategory(input);

      const supabase = createClient();
      const orgId = requireOrganizationId(user);
      if (input.id) {
        const { data, error } = await supabase
          .from("product_categories")
          .update({ name })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw friendly(error.message);
        if (input.previousName && input.previousName !== name) {
          const q = supabase.from("products");
          const { error: pErr } = input.parent_id
            ? await q
                .update({ subcategory: name })
                .eq("category", input.parentName ?? "")
                .eq("subcategory", input.previousName)
            : await q.update({ category: name }).eq("category", input.previousName);
          if (pErr) throw pErr;
        }
        return data as ProductCategoryRow;
      }
      const { data, error } = await supabase
        .from("product_categories")
        .insert({ name, parent_id: input.parent_id ?? null, organization_id: orgId })
        .select()
        .single();
      if (error) throw friendly(error.message);
      return data as ProductCategoryRow;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (categoryId: string) => {
      if (isDemoMode()) return demoDb.deleteProductCategory(categoryId);
      const supabase = createClient();
      const { error } = await supabase.from("product_categories").delete().eq("id", categoryId);
      if (error) throw friendly(error.message);
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}

function friendly(message: string): Error {
  if (/duplicate key|unique/i.test(message)) return new Error("That name already exists here.");
  if (MISSING_TABLE.test(message)) {
    return new Error("Categories need a quick database update (migration 038). Ask your admin to run it.");
  }
  return new Error(message);
}

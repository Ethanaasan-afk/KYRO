"use client";

import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useCategoryTree, useProductCategoryMutations } from "@/hooks/use-product-categories";
import type { CategoryNode } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, FolderTree, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

function InlineName({
  initial = "",
  placeholder,
  onSave,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
    >
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="h-9 min-w-0 flex-1 rounded-[8px] border border-primary/40 bg-surface px-2.5 text-sm text-ink outline-none ring-4 ring-primary/10"
      />
      <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary text-white" aria-label="Save">
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-slate"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

function CategoryRow({ node, defaultOpen }: { node: CategoryNode; defaultOpen: boolean }) {
  const { upsert, remove } = useProductCategoryMutations();
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [renamingSub, setRenamingSub] = useState<string | null>(null);

  const fail = (e: unknown) => toast((e as Error).message, "error");

  /** Built-in parents become the shop's own row the first time a subcategory is added. */
  const ensureParentId = async () => {
    if (node.id) return node.id;
    const row = await upsert.mutateAsync({ name: node.name });
    return row.id;
  };

  return (
    <li className="rounded-[12px] border border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate hover:bg-cloud"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </button>
        {renaming ? (
          <div className="flex-1">
            <InlineName
              initial={node.name}
              placeholder="Category name"
              onCancel={() => setRenaming(false)}
              onSave={(name) =>
                upsert.mutate(
                  { id: node.id, name, previousName: node.name },
                  { onSuccess: () => (setRenaming(false), toast(`Renamed to ${name}`)), onError: fail }
                )
              }
            />
          </div>
        ) : (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold text-ink">{node.name}</span>
              <span className="block text-[11px] text-slate">
                {node.subcategories.length} subcategor{node.subcategories.length === 1 ? "y" : "ies"} ·{" "}
                {node.productCount} product{node.productCount === 1 ? "" : "s"}
              </span>
            </button>
            {node.builtIn && !node.id ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate" title="Suggested for your business type">
                <Lock className="h-3 w-3" /> Built-in
              </span>
            ) : node.id ? (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setRenaming(true)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate hover:bg-cloud hover:text-ink" aria-label={`Rename ${node.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (node.productCount > 0 && !window.confirm(`${node.productCount} product(s) use "${node.name}". They keep the name, but it leaves your list. Remove it?`)) return;
                    remove.mutate(node.id!, { onSuccess: () => toast(`Removed ${node.name}`), onError: fail });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate hover:bg-rose/10 hover:text-rose"
                  aria-label={`Delete ${node.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 pb-3 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {node.subcategories.map((sub) =>
                  renamingSub === sub.name && sub.id ? (
                    <div key={sub.name} className="w-full">
                      <InlineName
                        initial={sub.name}
                        placeholder="Subcategory name"
                        onCancel={() => setRenamingSub(null)}
                        onSave={(name) =>
                          upsert.mutate(
                            { id: sub.id, name, parent_id: node.id, previousName: sub.name, parentName: node.name },
                            { onSuccess: () => setRenamingSub(null), onError: fail }
                          )
                        }
                      />
                    </div>
                  ) : (
                    <span
                      key={sub.name}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-cloud py-1 pl-3 pr-1.5 text-xs font-medium text-ink"
                    >
                      {sub.name}
                      {sub.productCount > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{sub.productCount}</span>
                      )}
                      {sub.id ? (
                        <>
                          <button type="button" onClick={() => setRenamingSub(sub.name)} className="rounded-full p-0.5 text-slate opacity-60 hover:opacity-100" aria-label={`Rename ${sub.name}`}>
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove.mutate(sub.id!, { onError: fail })}
                            className="rounded-full p-0.5 text-slate opacity-60 hover:text-rose hover:opacity-100"
                            aria-label={`Delete ${sub.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <span className="w-1" />
                      )}
                    </span>
                  )
                )}
                {!node.subcategories.length && !addingSub && (
                  <span className="text-xs text-slate">No subcategories yet.</span>
                )}
              </div>
              <div className="mt-2.5">
                {addingSub ? (
                  <InlineName
                    placeholder="e.g. Leafy greens"
                    onCancel={() => setAddingSub(false)}
                    onSave={async (name) => {
                      try {
                        const parentId = await ensureParentId();
                        await upsert.mutateAsync({ name, parent_id: parentId });
                        toast(`Added ${name} to ${node.name}`);
                        setAddingSub(false);
                      } catch (e) {
                        fail(e);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(true);
                      setAddingSub(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add subcategory
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tree } = useCategoryTree();
  const { upsert } = useProductCategoryMutations();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");

  const visible = tree.filter(
    (n) =>
      !filter ||
      n.name.toLowerCase().includes(filter.toLowerCase()) ||
      n.subcategories.some((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
  );
  // The shop's own / in-use categories first; untouched built-in suggestions after
  const mine = visible.filter((n) => n.id || n.productCount > 0);
  const suggested = visible.filter((n) => !n.id && n.productCount === 0);

  return (
    <Modal open={open} onClose={onClose} title="Categories & subcategories" size="lg">
      <div className="flex items-start gap-3 rounded-[12px] bg-primary-soft p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/15 text-primary">
          <FolderTree className="h-5 w-5" />
        </span>
        <p className="text-sm text-ink">
          Group what you sell, then narrow it down - e.g. <strong>Vegetables › Leafy greens</strong> or{" "}
          <strong>Bedroom › Mattresses</strong>. Built-in categories match your business type; add your own any time.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a category…"
          className="h-10 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary"
        />
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> New category
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-3">
          <InlineName
            placeholder="e.g. Vegetables"
            onCancel={() => setAdding(false)}
            onSave={(name) =>
              upsert.mutate(
                { name },
                {
                  onSuccess: () => {
                    toast(`Added ${name}`);
                    setAdding(false);
                  },
                  onError: (e) => toast((e as Error).message, "error"),
                }
              )
            }
          />
        </div>
      )}

      {mine.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">Your categories</p>
          <ul className="space-y-2">
            {mine.map((node, i) => (
              <CategoryRow key={node.name} node={node} defaultOpen={i === 0 && !filter ? true : !!filter} />
            ))}
          </ul>
        </>
      )}
      {suggested.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
            Suggested for your business
          </p>
          <ul className="space-y-2">
            {suggested.map((node, i) => (
              <CategoryRow key={node.name} node={node} defaultOpen={!mine.length && i === 0 && !filter} />
            ))}
          </ul>
        </>
      )}
      {!visible.length && <p className="py-6 text-center text-sm text-slate">Nothing matches “{filter}”.</p>}
    </Modal>
  );
}

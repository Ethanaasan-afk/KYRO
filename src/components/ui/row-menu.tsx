"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type RowMenuItem = {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
};

/**
 * Compact "⋯" menu for table rows - keeps rows to one line on every screen.
 * Rendered in a portal so scrolling tables never clip it.
 */
export function RowMenu({ items, label = "More actions" }: { items: RowMenuItem[]; label?: string }) {
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);
  const open = !!pos;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (!visible.length) return null;

  const toggle = () => {
    if (open) return setPos(null);
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const up = window.innerHeight - r.bottom < 48 * visible.length + 24;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, right: window.innerWidth - r.right, up });
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-[8px] text-slate transition-colors hover:bg-cloud hover:text-ink",
          open && "bg-cloud text-ink"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {pos && (
              <motion.div
                ref={menu}
                role="menu"
                initial={{ opacity: 0, scale: 0.95, y: pos.up ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.14 }}
                style={{
                  position: "fixed",
                  right: pos.right,
                  ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
                }}
                className={cn(
                  "z-[70] min-w-[176px] overflow-hidden rounded-[12px] border border-border bg-surface p-1 shadow-lift",
                  pos.up ? "origin-bottom-right" : "origin-top-right"
                )}
              >
                {visible.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPos(null);
                      item.onSelect();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm transition-colors",
                      item.danger ? "text-rose hover:bg-rose/10" : "text-ink hover:bg-cloud"
                    )}
                  >
                    {item.icon ? <item.icon className="h-4 w-4 shrink-0 opacity-70" /> : null}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

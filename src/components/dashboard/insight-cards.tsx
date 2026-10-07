"use client";

import { ConfettiBurst, CountUp, ProgressRing } from "@/components/ui/count-up";
import type {
  AgingBucket,
  Debtor,
  DayPoint,
  GoalProgress,
  HeatCell,
  Milestone,
  PeriodSummary,
  Ranked,
  Streak,
  VatQuarter,
} from "@/lib/insights";
import { formatQty } from "@/lib/units";
import { cn, formatCurrency, formatDate, getDefaultCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BellRing,
  Boxes,
  Check,
  CircleDollarSign,
  Flame,
  Landmark,
  Mail,
  Pencil,
  Receipt,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => formatCurrency(n);
const moneyRound = (n: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: getDefaultCurrency(),
    maximumFractionDigits: 0,
  }).format(n);
const compact = (n: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: getDefaultCurrency(),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

// ---------- shell ----------

export function Card({
  title,
  icon: Icon,
  action,
  children,
  className,
  delay = 0,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={cn("panel relative flex flex-col p-5 sm:p-6", className)}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
              {Icon ? <Icon className="h-4 w-4 text-primary" aria-hidden /> : null}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function DeltaChip({ value, inverse = false, suffix = "" }: { value: number | null; inverse?: boolean; suffix?: string }) {
  if (value === null) return <span className="text-[11px] font-medium text-slate">new</span>;
  const up = value >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        Math.abs(value) < 0.5
          ? "bg-cloud text-slate"
          : good
            ? "bg-sage-soft text-sage"
            : "bg-rose/10 text-rose"
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}%{suffix}
    </span>
  );
}

// ---------- hero: today ----------

export function TodayCard({
  today,
  sameDayLastWeek,
  collectedToday,
  last14,
}: {
  today: PeriodSummary;
  sameDayLastWeek: PeriodSummary;
  collectedToday: number;
  last14: DayPoint[];
}) {
  const max = Math.max(1, ...last14.map((d) => d.revenue));
  const change = sameDayLastWeek.revenue
    ? ((today.revenue - sameDayLastWeek.revenue) / sameDayLastWeek.revenue) * 100
    : null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-[#5b0fd0] via-[#7c1cf0] to-[#b65cff] p-5 text-white shadow-[0_18px_40px_-14px_rgba(124,28,240,0.55)] sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-[#e879f9]/25 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Today&apos;s sales</p>
          {change !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change).toFixed(0)}% vs last {new Date().toLocaleDateString("en-GB", { weekday: "short" })}
            </span>
          ) : null}
        </div>
        <CountUp
          value={today.revenue}
          format={money}
          className="mt-2 block font-display text-[2.4rem] font-bold leading-none tracking-tight sm:text-5xl"
        />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
          <span>
            <strong className="font-semibold text-white">{today.count}</strong> invoice{today.count === 1 ? "" : "s"}
          </span>
          <span>
            <strong className="font-semibold text-white">{moneyRound(collectedToday)}</strong> collected
          </span>
          {today.count > 0 && (
            <span>
              avg <strong className="font-semibold text-white">{moneyRound(today.average)}</strong>
            </span>
          )}
        </div>
        <div className="mt-5 flex h-16 items-end gap-1" aria-label="Last 14 days">
          {last14.map((d, i) => (
            <motion.div
              key={d.date}
              title={`${d.label}: ${money(d.revenue)}`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(6, (d.revenue / max) * 100)}%` }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 + i * 0.03 }}
              className={cn(
                "flex-1 rounded-t-[4px]",
                i === last14.length - 1 ? "bg-white" : d.revenue ? "bg-white/35" : "bg-white/10"
              )}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-white/60">
          <span>{last14[0]?.label}</span>
          <span>Today</span>
        </div>
      </div>
    </motion.section>
  );
}

// ---------- hero: goal ----------

export function GoalCard({
  goal,
  onSaveGoal,
  saving,
}: {
  goal: GoalProgress;
  onSaveGoal: (value: number) => void;
  saving?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(Math.round(goal.goal)));
  const onTrack = goal.projected >= goal.goal;
  const remaining = Math.max(0, goal.goal - goal.achieved);
  const month = new Date().toLocaleDateString("en-GB", { month: "long" });

  return (
    <Card
      title={`${month} goal`}
      icon={Target}
      delay={0.06}
      action={
        !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(String(Math.round(goal.goal)));
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )
      }
    >
      <div className="flex items-center gap-5">
        <div className="relative">
          <ProgressRing pct={goal.pct} id="goal" size={124} stroke={11}>
            <CountUp value={goal.pct} format={(n) => `${Math.round(n)}%`} className="font-display text-2xl font-bold text-ink" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate">of goal</span>
          </ProgressRing>
          <ConfettiBurst fire={goal.hit} />
        </div>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.form
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(draft);
                  if (n > 0) onSaveGoal(n);
                  setEditing(false);
                }}
                className="space-y-2"
              >
                <label className="text-[11px] font-medium text-slate" htmlFor="goal-input">
                  Monthly sales goal ({getDefaultCurrency()})
                </label>
                <input
                  id="goal-input"
                  autoFocus
                  type="number"
                  min={1}
                  step="any"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-primary/40 bg-surface px-3 font-mono text-sm text-ink outline-none ring-4 ring-primary/10"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="h-9 rounded-[10px] bg-primary px-3 text-xs font-semibold text-white">
                    Save goal
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-[10px] px-3 text-xs font-medium text-slate">
                    Cancel
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="font-display text-xl font-bold tracking-tight text-ink">{moneyRound(goal.achieved)}</p>
                <p className="text-xs font-medium text-slate">of {moneyRound(goal.goal)}</p>
                {goal.hit ? (
                  <p className="mt-1.5 text-sm font-medium text-sage">Goal smashed! 🎉 Everything from here is bonus.</p>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm text-ink">
                      <strong>{moneyRound(remaining)}</strong> to go · {goal.daysLeft} day{goal.daysLeft === 1 ? "" : "s"} left
                    </p>
                    <p className={cn("mt-1 text-xs", onTrack ? "text-sage" : "text-slate")}>
                      {onTrack ? (
                        <>
                          <Check className="mr-0.5 inline h-3.5 w-3.5" />
                          On pace for {moneyRound(goal.projected)}
                        </>
                      ) : (
                        <>About {moneyRound(goal.neededPerDay)} a day gets you there</>
                      )}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

// ---------- hero: streak ----------

const HEAT = [
  "bg-[var(--border)] opacity-60",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

export function StreakCard({ streak, heatmap }: { streak: Streak; heatmap: HeatCell[][] }) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  const atRisk = streak.current > 0 && !streak.billedToday;
  return (
    <Card title="Billing streak" icon={Flame} delay={0.12}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.span
            animate={streak.current > 0 ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2 }}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-[14px]",
              streak.current > 0 ? "bg-gradient-to-br from-[#fb923c] to-[#f43f5e] text-white shadow-[0_8px_20px_-6px_rgba(244,63,94,0.6)]" : "bg-cloud text-slate"
            )}
          >
            <Flame className="h-6 w-6" />
          </motion.span>
          <div>
            <p className="font-display text-2xl font-bold leading-none text-ink">
              {streak.current} day{streak.current === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs text-slate">Best run: {streak.best} days</p>
          </div>
        </div>
        <p className={cn("max-w-[150px] text-right text-[11px] font-medium", atRisk ? "text-[#c2410c] dark:text-[#fdba74]" : "text-slate")}>
          {atRisk
            ? "Bill once today to keep it alive"
            : streak.billedToday
              ? "Today's done - see you tomorrow"
              : "Bill today to start a streak"}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto pb-1 [scrollbar-width:none]">
        <div className="flex w-max gap-[3px]" onMouseLeave={() => setHover(null)}>
          {heatmap.map((week, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <motion.div
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: cell.future ? 0.15 : 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.25 + w * 0.025 }}
                  onMouseEnter={() => setHover(cell)}
                  className={cn("h-[13px] w-[13px] rounded-[3px]", cell.future ? "bg-transparent" : HEAT[cell.level])}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 h-4 text-[11px] text-slate">
        {hover && !hover.future
          ? `${formatDate(hover.date)} · ${hover.count} invoice${hover.count === 1 ? "" : "s"} · ${money(hover.revenue)}`
          : "Darker squares = bigger sales days"}
      </p>
    </Card>
  );
}

// ---------- sales trend ----------

export type TrendRange = "7d" | "30d" | "90d" | "12m";

export function SalesTrendCard({
  range,
  onRange,
  series,
  previous,
  summary,
  previousSummary,
}: {
  range: TrendRange;
  onRange: (r: TrendRange) => void;
  series: DayPoint[];
  previous: DayPoint[];
  summary: PeriodSummary;
  previousSummary: PeriodSummary;
}) {
  const [compare, setCompare] = useState(true);
  const data = useMemo(
    () => series.map((p, i) => ({ ...p, previous: previous[i]?.revenue ?? 0 })),
    [series, previous]
  );
  const kpis: { label: string; value: string; delta: number | null }[] = [
    { label: "Revenue", value: moneyRound(summary.revenue), delta: pct(summary.revenue, previousSummary.revenue) },
    { label: "Invoices", value: String(summary.count), delta: pct(summary.count, previousSummary.count) },
    { label: "Average bill", value: moneyRound(summary.average), delta: pct(summary.average, previousSummary.average) },
    { label: "VAT charged", value: moneyRound(summary.vat), delta: pct(summary.vat, previousSummary.vat) },
  ];
  return (
    <Card
      title="Sales trend"
      icon={Receipt}
      delay={0.18}
      className="lg:col-span-2"
      action={
        <div className="flex items-center gap-2">
          <label className="hidden items-center gap-1.5 text-[11px] font-medium text-slate sm:flex">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--primary)]" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Compare
          </label>
          <div className="flex rounded-[10px] bg-cloud p-0.5">
            {(["7d", "30d", "90d", "12m"] as TrendRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRange(r)}
                className={cn(
                  "relative rounded-[8px] px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
                  range === r ? "text-ink" : "text-slate hover:text-ink"
                )}
              >
                {range === r && (
                  <motion.span layoutId="trend-range" className="absolute inset-0 rounded-[8px] bg-surface shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{r}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[12px] border border-border bg-cloud/50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-slate">{k.label}</p>
            <p className="mt-0.5 truncate font-display text-lg font-bold tracking-tight text-ink">{k.value}</p>
            <DeltaChip value={k.delta} />
          </div>
        ))}
      </div>
      <div className="mt-4 h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c1cf0" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#7c1cf0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--slate)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => compact(v)}
              tick={{ fill: "var(--slate)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.3 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 12,
                boxShadow: "var(--card-shadow-lift)",
              }}
              formatter={(value, name) => [money(Number(value ?? 0)), name === "previous" ? "Previous period" : "This period"]}
            />
            {compare && (
              <Line type="monotone" dataKey="previous" stroke="var(--slate)" strokeOpacity={0.55} strokeDasharray="4 5" dot={false} strokeWidth={1.5} isAnimationActive />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              name="revenue"
              stroke="#7c1cf0"
              strokeWidth={2.5}
              fill="url(#trend-fill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "#7c1cf0" }}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function pct(a: number, b: number): number | null {
  if (!b) return a ? null : 0;
  return ((a - b) / b) * 100;
}

// ---------- money waiting ----------

const AGE_TONE = {
  ok: "bg-[#34d399]",
  warn: "bg-[#fbbf24]",
  late: "bg-[#fb923c]",
  danger: "bg-[#f43f5e]",
} as const;

export function MoneyWaitingCard({
  total,
  buckets,
  top,
  onRemind,
}: {
  total: number;
  buckets: AgingBucket[];
  top: Debtor[];
  onRemind: (d: Debtor) => void;
}) {
  return (
    <Card
      title="Waiting to be collected"
      icon={Wallet}
      delay={0.22}
      action={
        <Link href="/outstanding" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
          All <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      <CountUp value={total} format={money} className="font-display text-3xl font-bold tracking-tight text-coral-deep" />
      <p className="mt-1 text-xs text-slate">
        {total > 0 ? "Money you've earned but not received yet." : "Nothing owed - every bill is settled. 🙌"}
      </p>
      {total > 0 && (
        <>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-cloud">
            {buckets.map((b) =>
              b.amount > 0 ? (
                <motion.div
                  key={b.id}
                  title={`${b.label}: ${money(b.amount)}`}
                  className={AGE_TONE[b.tone]}
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.amount / total) * 100}%` }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
                />
              ) : null
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {buckets.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1 text-[10px] text-slate">
                <span className={cn("h-1.5 w-1.5 rounded-full", AGE_TONE[b.tone])} />
                {b.label}
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {top.slice(0, 3).map((d) => (
              <li key={d.customerId} className="flex items-center gap-3 rounded-[12px] border border-border bg-cloud/40 px-3 py-2">
                <Avatar name={d.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{d.name}</span>
                  <span className={cn("block text-[11px]", d.oldestDays > 60 ? "text-rose" : "text-slate")}>
                    {money(d.due)} · {d.oldestDays}d old
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemind(d)}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-primary/10 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <BellRing className="h-3.5 w-3.5" /> Remind
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = 250 + (hash % 90);
  return (
    <span
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 58%), hsl(${hue + 30} 75% 48%))` }}
    >
      {initials || "?"}
    </span>
  );
}

// ---------- rankings ----------

export function TopProductsCard({ items }: { items: (Ranked & { qty: number; unit?: string })[] }) {
  const [by, setBy] = useState<"value" | "qty">("value");
  const sorted = [...items].sort((a, b) => (by === "value" ? b.value - a.value : b.qty - a.qty));
  const max = Math.max(1, ...sorted.map((i) => (by === "value" ? i.value : i.qty)));
  return (
    <Card
      title="Best sellers · 90 days"
      icon={Trophy}
      delay={0.26}
      action={
        <div className="flex rounded-[8px] bg-cloud p-0.5 text-[11px] font-semibold">
          {(["value", "qty"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setBy(k)}
              className={cn("rounded-[6px] px-2 py-0.5 transition-colors", by === k ? "bg-surface text-ink shadow-sm" : "text-slate")}
            >
              {k === "value" ? "Sales" : "Qty"}
            </button>
          ))}
        </div>
      }
    >
      {sorted.length ? (
        <ul className="space-y-3">
          {sorted.map((p, i) => {
            const v = by === "value" ? p.value : p.qty;
            return (
              <li key={p.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", i === 0 ? "bg-[#fbbf24] text-[#422006]" : "bg-cloud text-slate")}>
                      {i + 1}
                    </span>
                    <span className="truncate font-medium text-ink">{p.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink">
                    {by === "value" ? moneyRound(p.value) : formatQty(p.qty, p.unit)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cloud">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c1cf0] to-[#c98bff]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / max) * 100}%` }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.06 }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyHint text="Your best sellers show up after the first few invoices." />
      )}
    </Card>
  );
}

export function TopCustomersCard({ items }: { items: Ranked[] }) {
  return (
    <Card title="Top customers · 90 days" icon={Award} delay={0.3}>
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((c, i) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="group flex items-center gap-3 rounded-[12px] px-1 py-1 transition-colors hover:bg-cloud/60">
                <Avatar name={c.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink group-hover:text-primary">{c.name}</span>
                  <span className="block text-[11px] text-slate">
                    {c.count} invoice{c.count === 1 ? "" : "s"} · {c.share.toFixed(0)}% of sales
                  </span>
                </span>
                <span className="font-mono text-xs font-semibold text-ink">{moneyRound(c.value)}</span>
                {i === 0 && <span className="text-sm" aria-label="Top customer">👑</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint text="Your most loyal customers will appear here." />
      )}
    </Card>
  );
}

// ---------- VAT ----------

export function VatCard({ vat }: { vat: VatQuarter }) {
  const refund = vat.net < 0;
  return (
    <Card
      title={refund ? "VAT refund expected" : "VAT to set aside"}
      icon={Landmark}
      delay={0.34}
      action={
        <Link href="/reports" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
          VAT 201 <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      <p className="text-xs text-slate">{vat.label} · estimate</p>
      <CountUp
        value={Math.abs(vat.net)}
        format={money}
        className={cn("mt-1 block font-display text-3xl font-bold tracking-tight", refund ? "text-sage" : "text-ink")}
      />
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate">VAT on sales</span>
          <span className="font-mono text-ink">{money(vat.outputVat)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">VAT on purchases</span>
          <span className="font-mono text-sage">− {money(vat.inputVat)}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-primary-soft px-3 py-2.5 text-xs text-ink">
        <CircleDollarSign className="h-4 w-4 shrink-0 text-primary" />
        <span>
          {refund
            ? "You've paid more VAT on purchases than you charged so far - this quarter may end in a refund."
            : "Keep this aside so filing day is stress-free."}{" "}
          Return due <strong>{formatDate(vat.dueDate)}</strong>
          {vat.daysToDue > 0 ? ` (in ${vat.daysToDue} days)` : ""}.
        </span>
      </div>
    </Card>
  );
}

// ---------- stock ----------

export type StockAlert = { id: string; name: string; stock: number; threshold: number; unit?: string };

export function StockHealthCard({ alerts, stockValue, skuCount }: { alerts: StockAlert[]; stockValue: number; skuCount: number }) {
  return (
    <Card
      title="Stock health"
      icon={Boxes}
      delay={0.38}
      action={
        <Link href="/inventory" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
          Inventory <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl font-bold tracking-tight text-ink">{moneyRound(stockValue)}</span>
        <span className="text-xs text-slate">{skuCount} items on the shelf</span>
      </div>
      {alerts.length ? (
        <ul className="mt-4 space-y-2.5">
          {alerts.slice(0, 4).map((a) => {
            const out = a.stock <= 0;
            const pctFill = Math.min(100, (Math.max(0, a.stock) / Math.max(1, a.threshold * 2)) * 100);
            return (
              <li key={a.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium text-ink">{a.name}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", out ? "bg-rose/15 text-rose" : "bg-amber/15 text-[#b45309] dark:text-[#fcd34d]")}>
                    {out ? "Out" : `${formatQty(a.stock, a.unit)} left`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cloud">
                  <motion.div
                    className={cn("h-full rounded-full", out ? "bg-rose" : "bg-amber")}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(3, pctFill)}%` }}
                    transition={{ duration: 0.8, ease: EASE }}
                  />
                </div>
              </li>
            );
          })}
          {alerts.length > 4 && <li className="text-[11px] text-slate">+ {alerts.length - 4} more running low</li>}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-sage">
          <Check className="h-4 w-4" /> Everything is well stocked.
        </p>
      )}
    </Card>
  );
}

// ---------- activity ----------

export type ActivityItem = {
  id: string;
  kind: "invoice" | "payment" | "email";
  title: string;
  detail: string;
  amount?: number;
  at: string;
  href?: string;
};

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : formatDate(iso);
}

const ACTIVITY_ICON = {
  invoice: { icon: Receipt, cls: "bg-primary/10 text-primary" },
  payment: { icon: CircleDollarSign, cls: "bg-sage-soft text-sage" },
  email: { icon: Mail, cls: "bg-[#60a5fa]/15 text-[#2563eb] dark:text-[#93c5fd]" },
} as const;

export function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card title="Recent activity" icon={Receipt} delay={0.42}>
      {items.length ? (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-border">
          {items.slice(0, 7).map((a, i) => {
            const meta = ACTIVITY_ICON[a.kind];
            const body = (
              <>
                <span className={cn("relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-[var(--surface)]", meta.cls)}>
                  <meta.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                  <span className="block truncate text-[11px] text-slate">
                    {a.detail} · {ago(a.at)}
                  </span>
                </span>
                {a.amount != null && (
                  <span className={cn("shrink-0 font-mono text-xs font-semibold", a.kind === "payment" ? "text-sage" : "text-ink")}>
                    {a.kind === "payment" ? "+" : ""}
                    {moneyRound(a.amount)}
                  </span>
                )}
              </>
            );
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.45 + i * 0.05 }}
              >
                {a.href ? (
                  <Link href={a.href} className="flex items-center gap-3 rounded-[10px] transition-colors hover:bg-cloud/60">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">{body}</div>
                )}
              </motion.li>
            );
          })}
        </ol>
      ) : (
        <EmptyHint text="Invoices, payments and emails will stream in here." />
      )}
    </Card>
  );
}

// ---------- onboarding + rewards ----------

export type SetupStep = { id: string; label: string; done: boolean; href: string };

export function SetupCard({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const pctDone = (done / steps.length) * 100;
  const next = steps.find((s) => !s.done);
  return (
    <Card title="Get set up" icon={Check} delay={0.08} className="border-primary/30">
      <div className="flex items-center gap-4">
        <ProgressRing pct={pctDone} size={64} stroke={7} id="setup">
          <span className="text-sm font-bold text-ink">
            {done}/{steps.length}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">
            {done === steps.length ? "All set! 🎉" : `${steps.length - done} quick step${steps.length - done === 1 ? "" : "s"} left`}
          </p>
          {next && (
            <Link href={next.href} className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Next: {next.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className={cn(
                "flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm transition-colors",
                s.done ? "text-slate line-through decoration-slate/40" : "text-ink hover:bg-cloud"
              )}
            >
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", s.done ? "border-sage bg-sage text-white" : "border-border")}>
                {s.done && <Check className="h-3 w-3" />}
              </span>
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function MilestonesCard({ items }: { items: Milestone[] }) {
  const next = items.find((m) => !m.achieved);
  return (
    <Card title="Milestones" icon={Trophy} delay={0.46}>
      {next && (
        <p className="mb-3 text-xs text-slate">
          Next up: <strong className="text-ink">{next.label}</strong> · {Math.round(next.progress)}% there
        </p>
      )}
      <ul className="grid grid-cols-3 gap-2">
        {items.map((m, i) => (
          <motion.li
            key={m.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 + i * 0.05 }}
            title={`${m.label} - ${m.detail}`}
            className={cn(
              "flex flex-col items-center rounded-[12px] border p-2.5 text-center",
              m.achieved ? "border-primary/30 bg-primary-soft" : "border-dashed border-border"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                m.achieved ? "bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white shadow-[0_6px_14px_-4px_rgba(245,158,11,0.6)]" : "bg-cloud text-slate-dim"
              )}
            >
              <Award className="h-5 w-5" />
            </span>
            <span className={cn("mt-1.5 text-[11px] font-semibold leading-tight", m.achieved ? "text-ink" : "text-slate")}>{m.label}</span>
            {!m.achieved && (
              <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-cloud">
                <span className="block h-full rounded-full bg-primary/60" style={{ width: `${m.progress}%` }} />
              </span>
            )}
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="rounded-[12px] border border-dashed border-border px-4 py-6 text-center text-sm text-slate">{text}</p>;
}

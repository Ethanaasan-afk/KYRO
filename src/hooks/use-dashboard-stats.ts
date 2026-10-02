"use client";

import { useBusinessDataEntries } from "@/hooks/use-business-data";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import { usePayments } from "@/hooks/use-payments";
import { useProducts } from "@/hooks/use-products";
import { useStockMovements } from "@/hooks/use-inventory";
import { buildOutstandingRows } from "@/lib/customer-ledger";
import { useMemo } from "react";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const STOCK_COLORS = ["#84cc16", "#ec4899", "#34d399", "#2dd4bf", "#a855f7"];

export type DashboardStats = {
  todayRevenue: number;
  todayInvoiceCount: number;
  todayPaidInvoiceCount: number;
  monthInvoiceCount: number;
  monthRevenue: number;
  monthExpenses: number;
  manufacturingCostSold: number;
  uncostedSoldUnits: number;
  net: number;
  revenueTrend: { date: string; label: string; revenue: number }[];
  last30Revenue: number;
  startTimestamp: number;
  endTimestamp: number;
  activeSkuCount: number;
  totalSkuCount: number;
  stockAlertCount: number;
  stockMix: { inStock: number; low: number; out: number };
  stockTrend: {
    id: string;
    name: string;
    points: { x: number; y: number }[];
    movementCount: number;
    color: string;
  }[];
  totalStockUnits: number;
  totalStockValue: number;
  customersByType: { retail: number; wholesale: number };
  customerCount: number;
  totalOutstanding: number;
  outstandingCount: number;
  stockMixChart: { name: string; value: number; color: string }[];
  monthCostAfterMfg: number;
};

export function useDashboardStats() {
  const today = new Date();
  const todayKey = dateKey(today);
  const monthStart = `${todayKey.slice(0, 7)}-01`;
  const thirtyDayStart = new Date(today);
  thirtyDayStart.setDate(thirtyDayStart.getDate() - 29);
  const startKey = dateKey(thirtyDayStart);
  const movementStartKey = monthStart < startKey ? monthStart : startKey;
  const stockSince = new Date(`${movementStartKey}T00:00:00`).toISOString();

  const invoiceQuery = useInvoices();
  const productQuery = useProducts();
  const customerQuery = useCustomers();
  const paymentQuery = usePayments();
  const movementQuery = useStockMovements(undefined, stockSince);
  const expenseQuery = useBusinessDataEntries("other_expenses", monthStart, todayKey);
  const queries = [invoiceQuery, productQuery, customerQuery, paymentQuery, movementQuery, expenseQuery];

  const stats = useMemo(() => {
    const invoices = invoiceQuery.data ?? [];
    const products = productQuery.data ?? [];
    const customers = customerQuery.data ?? [];
    const payments = paymentQuery.data ?? [];
    const movements = movementQuery.data ?? [];
    const expenses = expenseQuery.data ?? [];
    const chartStart = new Date(`${startKey}T00:00:00`);
    const endOfToday = new Date(`${todayKey}T23:59:59.999`);
    const monthStartTime = new Date(`${monthStart}T00:00:00`).getTime();
    const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
    const todayInvoices = activeInvoices.filter((invoice) => invoice.invoice_date === todayKey);
    const monthInvoices = activeInvoices.filter((invoice) => invoice.invoice_date >= monthStart && invoice.invoice_date <= todayKey);
    const monthInvoiceNumbers = new Set(monthInvoices.map((invoice) => invoice.invoice_number));
    const revenueByDay = new Map<string, number>();

    for (const invoice of activeInvoices) {
      if (invoice.invoice_date >= startKey && invoice.invoice_date <= todayKey) {
        revenueByDay.set(
          invoice.invoice_date,
          (revenueByDay.get(invoice.invoice_date) ?? 0) + Number(invoice.grand_total)
        );
      }
    }

    const revenueTrend = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + index);
      const key = dateKey(date);
      return {
        date: key,
        label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        revenue: revenueByDay.get(key) ?? 0,
      };
    });

    const activeProducts = products.filter((product) => product.is_active);
    const stockableProducts = activeProducts.filter((product) => !product.is_service);
    const productMap = new Map(activeProducts.map((product) => [product.id, product]));
    const stockMix = {
      inStock: stockableProducts.filter((product) => Number(product.current_stock ?? 0) > Number(product.reorder_threshold ?? 0)).length,
      low: stockableProducts.filter((product) => {
        const quantity = Number(product.current_stock ?? 0);
        return quantity > 0 && quantity <= Number(product.reorder_threshold ?? 0);
      }).length,
      out: stockableProducts.filter((product) => Number(product.current_stock ?? 0) <= 0).length,
    };
    const recentMovements = movements
      .filter((movement) => {
        const timestamp = new Date(movement.created_at).getTime();
        return timestamp >= chartStart.getTime() && timestamp <= endOfToday.getTime();
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const monthMovements = movements.filter((movement) => {
      const timestamp = new Date(movement.created_at).getTime();
      return timestamp >= monthStartTime && timestamp <= endOfToday.getTime();
    });
    const movementGroups = new Map<string, typeof recentMovements>();
    for (const movement of recentMovements) {
      const items = movementGroups.get(movement.product_id) ?? [];
      items.push(movement);
      movementGroups.set(movement.product_id, items);
    }
    const stockTrend = Array.from(movementGroups.entries())
      .map(([productId, productMovements]) => {
        const product = productMap.get(productId);
        if (!product) return null;
        const movementTotal = productMovements.reduce((sum, movement) => sum + Number(movement.quantity), 0);
        let runningUnits = Number(product.current_stock ?? 0) - movementTotal;
        const points = productMovements.map((movement) => {
          runningUnits += Number(movement.quantity);
          return { x: new Date(movement.created_at).getTime(), y: runningUnits };
        });
        return { id: product.id, name: product.name, points, movementCount: points.length };
      })
      .filter((series): series is NonNullable<typeof series> => series !== null)
      .sort((a, b) => b.movementCount - a.movementCount)
      .slice(0, STOCK_COLORS.length)
      .map((series, index) => ({ ...series, color: STOCK_COLORS[index] }));

    const outstandingRows = buildOutstandingRows(customers, invoices, payments);
    const monthInvoiceOuts = monthMovements.filter(
      (movement) => movement.movement_type === "out" &&
        movement.reason?.startsWith("Invoice ") &&
        monthInvoiceNumbers.has(movement.reference ?? "")
    );
    let manufacturingCostSold = 0;
    let uncostedSoldUnits = 0;
    for (const movement of monthInvoiceOuts) {
      const product = productMap.get(movement.product_id);
      if (product?.manufacturing_cost == null) {
        uncostedSoldUnits += Math.abs(Number(movement.quantity));
      } else {
        manufacturingCostSold += Math.abs(Number(movement.quantity)) * Number(product.manufacturing_cost);
      }
    }

    const monthRevenue = monthInvoices.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0);
    const monthExpenses = expenses.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const totalStockUnits = stockableProducts.reduce((sum, product) => sum + Number(product.current_stock ?? 0), 0);
    const totalStockValue = stockableProducts.reduce(
      (sum, product) => sum + Number(product.current_stock ?? 0) * Number(product.base_price ?? 0),
      0
    );
    const totalOutstanding = outstandingRows.reduce((sum, row) => sum + row.outstanding, 0);
    const customersByType = {
      retail: customers.filter((customer) => customer.customer_type === "b2c").length,
      wholesale: customers.filter((customer) => customer.customer_type === "b2b").length,
    };

    return {
      todayRevenue: todayInvoices.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0),
      todayInvoiceCount: todayInvoices.length,
      todayPaidInvoiceCount: todayInvoices.filter((invoice) => invoice.status === "paid").length,
      monthInvoiceCount: monthInvoices.length,
      monthRevenue,
      monthExpenses,
      manufacturingCostSold,
      uncostedSoldUnits,
      net: monthRevenue - manufacturingCostSold - monthExpenses,
      revenueTrend,
      last30Revenue: revenueTrend.reduce((sum, point) => sum + point.revenue, 0),
      startTimestamp: chartStart.getTime(),
      endTimestamp: endOfToday.getTime(),
      activeSkuCount: activeProducts.filter((product) => !product.is_service).length,
      totalSkuCount: products.filter((product) => !product.is_service).length,
      stockAlertCount: stockMix.low + stockMix.out,
      stockMix,
      stockTrend,
      totalStockUnits,
      totalStockValue,
      customersByType,
      customerCount: customers.length,
      totalOutstanding,
      outstandingCount: outstandingRows.length,
      stockMixChart: [
        { name: "In stock", value: stockMix.inStock, color: "var(--primary)" },
        { name: "Low", value: stockMix.low, color: "var(--amber)" },
        { name: "Out", value: stockMix.out, color: "var(--rose)" },
      ],
      monthCostAfterMfg: monthRevenue - manufacturingCostSold,
    };
  }, [
    customerQuery.data,
    expenseQuery.data,
    invoiceQuery.data,
    movementQuery.data,
    paymentQuery.data,
    productQuery.data,
    monthStart,
    startKey,
    todayKey,
  ]);

  const retry = async () => {
    await Promise.all(queries.map((query) => query.refetch()));
  };

  return {
    stats,
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    retry,
  };
}
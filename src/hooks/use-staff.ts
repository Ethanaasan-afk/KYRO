"use client";

import { useAuth } from "@/components/auth-provider";
import { browserTimeZone } from "@/lib/attendance";
import { isDemoMode } from "@/lib/demo/mode";
import { demoStaff } from "@/lib/demo/staff";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { AttendancePunch, Employee } from "@/lib/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const ATTENDANCE_BUCKET = "attendance";

const EMPLOYEE_COLUMNS =
  "id, organization_id, full_name, job_title, phone, shift_start, shift_end, allow_phone, checkin_token, photo_path, has_pin, active, created_at";

const MIGRATION_HINT =
  "Staff & Attendance needs one database update. Run supabase/migrations/043_pos_staff_ai.sql in the Supabase SQL Editor.";

function friendly(error: { message?: string; code?: string } | null | undefined): Error {
  const msg = error?.message ?? "Something went wrong";
  if (error?.code === "42P01" || /relation .* does not exist|schema cache|Could not find the table/i.test(msg)) {
    return new Error(MIGRATION_HINT);
  }
  return new Error(msg);
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async (): Promise<Employee[]> => {
      if (isDemoMode()) return demoStaff.employees();
      const supabase = createClient();
      const { data, error } = await supabase.from("employees").select(EMPLOYEE_COLUMNS).order("full_name");
      if (error) throw friendly(error);
      return (data ?? []) as Employee[];
    },
  });
}

/** Punches whose instant falls in [from, to). */
export function useAttendance(fromIso: string, toIso: string) {
  return useQuery({
    queryKey: ["attendance", fromIso, toIso],
    queryFn: async (): Promise<AttendancePunch[]> => {
      if (isDemoMode()) return demoStaff.punches(fromIso, toIso);
      const supabase = createClient();
      const rows: AttendancePunch[] = [];
      for (let start = 0; start < 20000; start += 1000) {
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .gte("at", fromIso)
          .lt("at", toIso)
          .order("at", { ascending: false })
          .range(start, start + 999);
        if (error) throw friendly(error);
        rows.push(...((data ?? []) as AttendancePunch[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Short-lived links to private photos. Demo photos are already data URLs. */
export function usePhotoUrls(paths: (string | null | undefined)[]) {
  const list = Array.from(new Set(paths.filter((p): p is string => !!p))).sort();
  return useQuery({
    queryKey: ["attendance-photos", list],
    enabled: list.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      const remote = list.filter((p) => !p.startsWith("data:"));
      for (const p of list) if (p.startsWith("data:")) out[p] = p;
      if (!remote.length || isDemoMode()) return out;
      const supabase = createClient();
      for (let i = 0; i < remote.length; i += 100) {
        const { data } = await supabase.storage.from(ATTENDANCE_BUCKET).createSignedUrls(remote.slice(i, i + 100), 3600);
        for (const s of data ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
      }
      return out;
    },
  });
}

export type EmployeeInput = {
  full_name: string;
  job_title: string | null;
  phone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  allow_phone: boolean;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const type = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useStaffMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const refresh = () => qc.invalidateQueries({ queryKey: ["employees"] });

  const save = useMutation({
    mutationFn: async (input: EmployeeInput & { id?: string }): Promise<Employee> => {
      const { id, ...fields } = input;
      if (isDemoMode()) return id ? demoStaff.updateEmployee(id, fields) : demoStaff.createEmployee(fields);
      const supabase = createClient();
      if (id) {
        const { data, error } = await supabase.from("employees").update(fields).eq("id", id).select(EMPLOYEE_COLUMNS).single();
        if (error) throw friendly(error);
        return data as Employee;
      }
      const organization_id = requireOrganizationId(user);
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...fields, organization_id })
        .select(EMPLOYEE_COLUMNS)
        .single();
      if (error) throw friendly(error);
      return data as Employee;
    },
    onSuccess: refresh,
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (isDemoMode()) return demoStaff.updateEmployee(id, { active });
      const { error } = await createClient().from("employees").update({ active }).eq("id", id);
      if (error) throw friendly(error);
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) return demoStaff.deleteEmployee(id);
      const { error } = await createClient().from("employees").delete().eq("id", id);
      if (error) throw friendly(error);
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const setPin = useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: string }) => {
      if (isDemoMode()) return demoStaff.setPin(id, pin);
      const res = await fetch("/api/attendance/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: id, pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save the PIN");
    },
    onSuccess: refresh,
  });

  /** New private check-in link; the old one stops working at once. */
  const resetLink = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) return demoStaff.newToken(id);
      const { error } = await createClient().from("employees").update({ checkin_token: newToken() }).eq("id", id);
      if (error) throw friendly(error);
    },
    onSuccess: refresh,
  });

  const setPhoto = useMutation({
    mutationFn: async ({ id, dataUrl }: { id: string; dataUrl: string }) => {
      if (isDemoMode()) return demoStaff.updateEmployee(id, { photo_path: dataUrl });
      const supabase = createClient();
      const orgId = requireOrganizationId(user);
      const path = `${orgId}/profiles/${id}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(ATTENDANCE_BUCKET)
        .upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: true });
      if (upErr) throw friendly(upErr);
      const { error } = await supabase.from("employees").update({ photo_path: path }).eq("id", id);
      if (error) throw friendly(error);
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["attendance-photos"] });
    },
  });

  return { save, setActive, remove, setPin, resetLink, setPhoto };
}

export function useAttendanceMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const refresh = () => qc.invalidateQueries({ queryKey: ["attendance"] });

  const addManual = useMutation({
    mutationFn: async (input: { employee_id: string; kind: "in" | "out"; at: string; note: string | null }) => {
      if (isDemoMode()) return demoStaff.addManual(input);
      const organization_id = requireOrganizationId(user);
      const { error } = await createClient()
        .from("attendance")
        .insert({ ...input, organization_id, source: "manual", created_by: user?.id ?? null });
      if (error) throw friendly(error);
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) return demoStaff.deletePunch(id);
      const { error } = await createClient().from("attendance").delete().eq("id", id);
      if (error) throw friendly(error);
    },
    onSuccess: refresh,
  });

  /** Kiosk punch on this signed-in device */
  const punch = useMutation({
    mutationFn: async (input: { employee_id: string; pin: string; photo: string }) => {
      const timeZone = browserTimeZone();
      if (isDemoMode()) return demoStaff.punch({ ...input, source: "kiosk", timeZone });
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "kiosk", ...input, timeZone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not record that. Please try again.");
      return json as { kind: "in" | "out"; at: string; name: string };
    },
    onSuccess: refresh,
  });

  return { addManual, remove, punch };
}

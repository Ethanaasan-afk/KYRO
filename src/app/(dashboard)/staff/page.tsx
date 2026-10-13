"use client";

import { SelfieCamera, fileToJpeg, type SelfieCameraHandle } from "@/components/attendance/selfie-camera";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { useToast } from "@/components/ui/toast";
import { useOrganization } from "@/hooks/use-company";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useEmployees, usePhotoUrls, useStaffMutations, type EmployeeInput } from "@/hooks/use-staff";
import type { Employee } from "@/lib/types";
import { whatsappShareUrl } from "@/lib/whatsapp";
import {
  Camera,
  Copy,
  KeyRound,
  Link2,
  MessageCircle,
  MonitorSmartphone,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

function Avatar({ e, url, size = 48 }: { e: Employee; url?: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-purple-dark)] to-[var(--brand-purple-light)] text-sm font-semibold text-white"
    >
      {initials(e.full_name)}
    </span>
  );
}

function EmployeeForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Employee | null;
  onSave: (v: EmployeeInput & { pin?: string }) => void;
  saving: boolean;
}) {
  const [v, setV] = useState({
    full_name: initial?.full_name ?? "",
    job_title: initial?.job_title ?? "",
    phone: initial?.phone ?? "",
    shift_start: hhmm(initial?.shift_start ?? "09:00"),
    shift_end: hhmm(initial?.shift_end ?? "18:00"),
    allow_phone: initial?.allow_phone ?? true,
    pin: "",
  });
  const [err, setErr] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.full_name.trim()) return setErr("Enter their name.");
        if (!initial && !/^\d{4,6}$/.test(v.pin)) return setErr("Give them a 4 to 6 digit PIN.");
        onSave({
          full_name: v.full_name.trim().slice(0, 80),
          job_title: v.job_title.trim() || null,
          phone: v.phone.trim() || null,
          shift_start: v.shift_start || null,
          shift_end: v.shift_end || null,
          allow_phone: v.allow_phone,
          pin: v.pin || undefined,
        });
      }}
    >
      <Input label="Full name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Job title" placeholder="Cashier" value={v.job_title} onChange={(e) => setV({ ...v, job_title: e.target.value })} />
        <Input label="Mobile (for WhatsApp)" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        <Input label="Shift starts" type="time" value={v.shift_start} onChange={(e) => setV({ ...v, shift_start: e.target.value })} help="Check-ins more than 10 minutes after this are marked late." />
        <Input label="Shift ends" type="time" value={v.shift_end} onChange={(e) => setV({ ...v, shift_end: e.target.value })} />
      </div>
      {!initial && (
        <Input
          label="Check-in PIN (4-6 digits)"
          inputMode="numeric"
          autoComplete="off"
          value={v.pin}
          onChange={(e) => setV({ ...v, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          help="They type this with a selfie to check in. Only they and you should know it."
        />
      )}
      <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={v.allow_phone}
          onChange={(e) => setV({ ...v, allow_phone: e.target.checked })}
        />
        <span>
          <span className="font-medium text-ink">Can check in from their own phone</span>
          <span className="block text-slate">They get a private link. Their location is recorded with each check-in.</span>
        </span>
      </label>
      {err && <p className="text-sm text-coral-deep">{err}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          {initial ? "Save changes" : "Add employee"}
        </Button>
      </div>
    </form>
  );
}

function PhotoModal({ e, onClose }: { e: Employee; onClose: () => void }) {
  const cam = useRef<SelfieCameraHandle>(null);
  const { setPhoto } = useStaffMutations();
  const { toast } = useToast();
  const save = async (dataUrl: string | null | undefined) => {
    if (!dataUrl) return;
    try {
      await setPhoto.mutateAsync({ id: e.id, dataUrl });
      toast(`Photo saved for ${e.full_name}`);
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };
  return (
    <Modal open onClose={onClose} title={`Photo of ${e.full_name}`} size="sm">
      <p className="mb-3 text-sm text-slate">Shown on the kiosk so they can find their name, and next to their check-in selfies.</p>
      <div className="mx-auto w-56">
        <SelfieCamera ref={cam} round onFallbackPhoto={save} />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={() => save(cam.current?.capture())} loading={setPhoto.isPending}>
          <Camera className="h-4 w-4" /> Take photo
        </Button>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-button border border-border bg-surface px-4 text-sm text-ink hover:bg-surface-hover">
          Upload instead
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (ev) => {
              const f = ev.target.files?.[0];
              if (f) await save(await fileToJpeg(f));
            }}
          />
        </label>
      </div>
    </Modal>
  );
}

export default function StaffPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: org } = useOrganization();
  const { limits } = useOrgAccess();
  const { data: employees, isLoading, error } = useEmployees();
  const photos = usePhotoUrls((employees ?? []).map((e) => e.photo_path));
  const m = useStaffMutations();
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [pinFor, setPinFor] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [photoFor, setPhotoFor] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  if (!isAdmin) return <EmptyState title="Admin only" description="Only admins can manage staff." />;

  const active = (employees ?? []).filter((e) => e.active);
  const link = (e: Employee) => `${window.location.origin}/checkin/${e.checkin_token}`;
  const business = org?.brand_name || org?.name || "work";

  const copyLink = async (e: Employee) => {
    try {
      await navigator.clipboard.writeText(link(e));
      toast("Check-in link copied");
    } catch {
      window.prompt("Copy this link", link(e));
    }
  };

  const save = async (v: EmployeeInput & { pin?: string }) => {
    try {
      const id = editing && editing !== "new" ? editing.id : undefined;
      const { pin: newPin, ...fields } = v;
      const saved = await m.save.mutateAsync({ ...fields, id });
      if (newPin) await m.setPin.mutateAsync({ id: saved.id, pin: newPin });
      toast(id ? "Saved" : `${saved.full_name} added. Take their photo next.`);
      setEditing(null);
      if (!id) setPhotoFor(saved);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Staff"
        description="Your team checks in and out with a PIN and a selfie - on the shop tablet or their own phone."
        accent="sage"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/attendance">
              <Button variant="secondary">Attendance</Button>
            </Link>
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add employee
            </Button>
          </div>
        }
      />

      {error ? (
        <EmptyState title="Staff isn't set up yet" description={(error as Error).message} />
      ) : isLoading ? (
        <LoadingBlock />
      ) : !employees?.length ? (
        <EmptyState
          title="Add your first employee"
          description="Give them a PIN, take their photo, and they can check in on the shop tablet or their phone."
          action={<Button onClick={() => setEditing("new")}>Add employee</Button>}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate">
            <span>
              {active.length} active{limits.maxEmployees != null ? ` of ${limits.maxEmployees} on your plan` : ""}
            </span>
            <Link href="/kiosk" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <MonitorSmartphone className="h-4 w-4" /> Open the check-in kiosk on this device
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {employees.map((e) => (
              <div key={e.id} className={`panel flex items-start gap-3 p-4 ${e.active ? "" : "opacity-60"}`}>
                <button onClick={() => setPhotoFor(e)} aria-label={`Photo of ${e.full_name}`} className="relative">
                  <Avatar e={e} url={e.photo_path ? photos.data?.[e.photo_path] : undefined} />
                  {!e.photo_path && (
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-surface p-1 shadow">
                      <Camera className="h-3 w-3 text-primary" />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{e.full_name}</p>
                  <p className="truncate text-sm text-slate">
                    {[e.job_title, e.shift_start && `${hhmm(e.shift_start)}–${hhmm(e.shift_end)}`].filter(Boolean).join(" · ") || "No shift set"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!e.active && <Badge>Inactive</Badge>}
                    {e.has_pin ? <Badge variant="success">PIN set</Badge> : <Badge variant="warning">No PIN</Badge>}
                    {e.allow_phone && <Badge>Phone check-in</Badge>}
                  </div>
                </div>
                <RowMenu
                  items={[
                    { label: "Edit", icon: Pencil, onSelect: () => setEditing(e) },
                    { label: e.has_pin ? "Change PIN" : "Set PIN", icon: KeyRound, onSelect: () => (setPin(""), setPinFor(e)) },
                    { label: "Take photo", icon: Camera, onSelect: () => setPhotoFor(e) },
                    { label: "Copy check-in link", icon: Copy, onSelect: () => copyLink(e), hidden: !e.allow_phone },
                    {
                      label: "Send link on WhatsApp",
                      icon: MessageCircle,
                      hidden: !e.allow_phone,
                      onSelect: () =>
                        window.open(
                          whatsappShareUrl(
                            e.phone,
                            `Hi ${e.full_name.split(" ")[0]}, this is your private link to check in and out at ${business}. Keep it to yourself:\n${link(e)}`
                          ),
                          "_blank",
                          "noopener"
                        ),
                    },
                    {
                      label: "Make a new link",
                      icon: RefreshCw,
                      hidden: !e.allow_phone,
                      onSelect: () =>
                        m.resetLink.mutate(e.id, {
                          onSuccess: () => toast("New link made. The old one no longer works."),
                          onError: (err) => toast(err.message, "error"),
                        }),
                    },
                    {
                      label: e.active ? "Mark as left" : "Make active again",
                      icon: Power,
                      onSelect: () =>
                        m.setActive.mutate(
                          { id: e.id, active: !e.active },
                          { onError: (err) => toast(err.message, "error") }
                        ),
                    },
                    { label: "Delete", icon: Trash2, danger: true, onSelect: () => setDeleting(e) },
                  ]}
                />
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-slate">
            <Link2 className="h-3.5 w-3.5" />
            Check-in links are private to each person. If one is shared, make a new link.
          </p>
        </>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === "new" ? "Add employee" : `Edit ${editing.full_name}`}>
          <EmployeeForm initial={editing === "new" ? null : editing} onSave={save} saving={m.save.isPending || m.setPin.isPending} />
        </Modal>
      )}

      {pinFor && (
        <Modal open onClose={() => setPinFor(null)} title={`PIN for ${pinFor.full_name}`} size="sm">
          <form
            className="space-y-4"
            onSubmit={async (ev) => {
              ev.preventDefault();
              try {
                await m.setPin.mutateAsync({ id: pinFor.id, pin });
                toast("PIN saved");
                setPinFor(null);
              } catch (err) {
                toast((err as Error).message, "error");
              }
            }}
          >
            <Input
              label="New PIN (4-6 digits)"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={pin.length < 4} loading={m.setPin.isPending}>
                Save PIN
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {photoFor && <PhotoModal e={photoFor} onClose={() => setPhotoFor(null)} />}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          m.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast("Deleted");
              setDeleting(null);
            },
            onError: (err) => toast(err.message, "error"),
          })
        }
        title={`Delete ${deleting?.full_name ?? ""}?`}
        message="This also deletes all their attendance records. To keep their history, use 'Mark as left' instead."
        confirmLabel="Delete"
        danger
        loading={m.remove.isPending}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  username: string;
  display_name: string;
  role: "owner" | "superadmin" | "admin";
  is_active: boolean;
};

type AdminRole = AdminUser["role"];

const roleOptions = [
  { value: "admin", label: "ผู้ดูแล" },
  { value: "superadmin", label: "หัวหน้าผู้ดูแล" },
  { value: "owner", label: "เจ้าของร้าน" }
] as const;

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentRole, setCurrentRole] = useState<AdminRole | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const canManageAdmins = currentRole === "owner" || currentRole === "superadmin";
  const canSetOwner = currentRole === "owner";

  async function loadUsers() {
    setLoadError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json().catch(() => null) as AdminUser[] | { error?: string } | null;

      if (!response.ok) {
        const message = !Array.isArray(data) && data?.error ? data.error : "โหลดรายชื่อผู้ดูแลไม่สำเร็จ";
        setLoadError(message);
        toast.error(message);
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setLoadError("โหลดรายชื่อผู้ดูแลไม่สำเร็จ");
      toast.error("โหลดรายชื่อผู้ดูแลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSession() {
    const response = await fetch("/api/admin/me", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { id?: string; username?: string; role?: AdminRole };
    setCurrentAdminId(data.id ?? "");
    setCurrentUsername(data.username ?? "");
    if (data.role === "owner" || data.role === "superadmin" || data.role === "admin") {
      setCurrentRole(data.role);
    }
  }

  useEffect(() => {
    void loadSession();
    void loadUsers();
  }, []);

  function addUser() {
    if (!canManageAdmins) {
      toast.error("เฉพาะเจ้าของร้านหรือหัวหน้าผู้ดูแลเท่านั้นที่เพิ่มผู้ดูแลได้");
      return;
    }

    setUsers((current) => [
      ...current,
      {
        id: "",
        username: "",
        display_name: "",
        role: "admin",
        is_active: true
      }
    ]);
  }

  function updateUser(index: number, patch: Partial<AdminUser> & { password?: string }) {
    setUsers((current) => {
      const next = [...current] as Array<AdminUser & { password?: string }>;
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function saveUser(user: AdminUser & { password?: string }) {
    if (isSaving) return;
    const isSelfEdit = isCurrentAdminUser(user);

    if (!canManageAdmins && !isSelfEdit) {
      toast.error("แก้ไขได้เฉพาะบัญชีของตัวเอง");
      return;
    }

    if (user.role === "owner" && !canSetOwner) {
      toast.error("เฉพาะเจ้าของร้านเท่านั้นที่ตั้งสิทธิ์เจ้าของร้านได้");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          password: user.password,
          isActive: user.is_active,
          role: user.role
        })
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data.error ?? "บันทึกผู้ดูแลไม่สำเร็จ";
        toast.error(message);
        return;
      }

      toast.success("บันทึกผู้ดูแลร้านแล้ว");
      if (isSelfEdit) {
        setCurrentUsername(user.username.trim());
      }
      await loadUsers();
      await loadSession();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (isSaving || deletingId) return;

    if (!canManageAdmins) {
      toast.error("เฉพาะเจ้าของร้านหรือหัวหน้าผู้ดูแลเท่านั้นที่ลบผู้ดูแลได้");
      return;
    }

    if (isCurrentAdminUser(user)) {
      toast.error("ไม่สามารถลบบัญชีตัวเองได้");
      return;
    }

    if (user.role === "owner" && !canSetOwner) {
      toast.error("เฉพาะเจ้าของร้านเท่านั้นที่ลบบัญชีเจ้าของร้านได้");
      return;
    }

    const confirmed = window.confirm(`ยืนยันลบผู้ดูแล ${user.username} หรือไม่?`);
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: "DELETE"
      });
      const data = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "ลบผู้ดูแลไม่สำเร็จ");
        return;
      }

      toast.success("ลบผู้ดูแลแล้ว");
      await loadUsers();
    } finally {
      setDeletingId("");
    }
  }

  function isCurrentAdminUser(user: AdminUser) {
    if (currentAdminId && user.id) return currentAdminId === user.id;
    return Boolean(currentUsername && user.username === currentUsername);
  }

  return (
    <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
      <fieldset disabled={isSaving} className="disabled:opacity-75">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">บัญชีผู้ดูแลร้าน</h2>
            <p className="mt-1 text-sm text-zinc-600">เพิ่ม แก้ไขชื่อ และตั้งรหัสผ่านผู้ดูแลร้าน</p>
            {currentRole === "admin" ? (
              <p className="mt-1 text-xs font-semibold text-blossom">บัญชีผู้ดูแลดูรายชื่อได้ แต่การเพิ่มและแก้ไขผู้ดูแลต้องใช้เจ้าของร้านหรือหัวหน้าผู้ดูแล</p>
            ) : !canSetOwner ? (
              <p className="mt-1 text-xs font-semibold text-blossom">บัญชีนี้จัดการผู้ดูแลและหัวหน้าผู้ดูแลได้ แต่การตั้งเจ้าของร้านต้องใช้บัญชีเจ้าของร้าน</p>
            ) : null}
          </div>
          <button type="button" onClick={addUser} disabled={!canManageAdmins} className="touch-target inline-flex items-center gap-2 rounded-soft bg-blossom px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
            <UserPlus size={17} /> เพิ่ม
          </button>
        </div>

        {loadError ? (
          <div className="rounded-soft border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">{loadError}</div>
        ) : isLoading ? (
          <div className="rounded-soft border border-pink-100 bg-blush p-4 text-sm font-semibold text-zinc-600">กำลังโหลดรายชื่อผู้ดูแล...</div>
        ) : users.length === 0 ? (
          <div className="rounded-soft border border-pink-100 bg-blush p-4 text-sm font-semibold text-zinc-600">ยังไม่มีรายชื่อผู้ดูแลในระบบ</div>
        ) : (
        <div className="grid gap-3">
          {users.map((user, index) => (
            <AdminUserRow
              key={user.id || index}
              user={user as AdminUser & { password?: string }}
              isSaving={isSaving}
              canManageAdmins={canManageAdmins}
              canSetOwner={canSetOwner}
              isSelf={isCurrentAdminUser(user)}
              isDeleting={deletingId === user.id}
              onSave={() => saveUser(user as AdminUser & { password?: string })}
              onDelete={() => deleteUser(user)}
              onUpdate={(patch) => updateUser(index, patch)}
            />
          ))}
        </div>
        )}
      </fieldset>
    </section>
  );
}

function AdminUserRow({
  user,
  isSaving,
  isDeleting,
  canManageAdmins,
  canSetOwner,
  isSelf,
  onSave,
  onDelete,
  onUpdate
}: {
  user: AdminUser & { password?: string };
  isSaving: boolean;
  isDeleting: boolean;
  canManageAdmins: boolean;
  canSetOwner: boolean;
  isSelf: boolean;
  onSave: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<AdminUser> & { password?: string }) => void;
}) {
  const canEditBasicFields = canManageAdmins || isSelf;
  const canDelete = canManageAdmins && !isSelf && user.id && (user.role !== "owner" || canSetOwner);

  return (
    <article className="grid gap-3 rounded-soft border border-pink-100 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_minmax(0,1fr)_150px_128px_112px] xl:items-end">
      <Field disabled={!canEditBasicFields} label="ชื่อผู้ใช้" value={user.username} onChange={(value) => onUpdate({ username: value })} />
      <Field disabled={!canEditBasicFields} label="ชื่อที่แสดง" value={user.display_name} onChange={(value) => onUpdate({ display_name: value })} />
      <RoleField value={user.role} disabled={!canManageAdmins || (user.role === "owner" && !canSetOwner)} canSetOwner={canSetOwner} onChange={(value) => onUpdate({ role: value })} />
      <Field disabled={!canEditBasicFields} label={user.id ? "รหัสผ่านใหม่" : "รหัสผ่าน"} type="password" value={user.password ?? ""} onChange={(value) => onUpdate({ password: value })} />
      <label className="touch-target flex items-center justify-between gap-3 rounded-soft border border-pink-100 bg-blush px-3 text-sm font-semibold text-ink">
        <span>เปิดใช้งาน</span>
        <input
          type="checkbox"
          disabled={!canManageAdmins || isSelf}
          checked={user.is_active}
          onChange={(event) => onUpdate({ is_active: event.target.checked })}
          className="size-4 accent-blossom disabled:cursor-not-allowed"
        />
      </label>
      <button type="button" disabled={!canEditBasicFields || (user.role === "owner" && !canSetOwner && !isSelf)} onClick={onSave} className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft bg-ink px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        <Save size={16} /> {isSaving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      <button type="button" disabled={!canDelete || isSaving || isDeleting} onClick={onDelete} className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft border border-red-100 bg-red-50 px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
        <Trash2 size={16} /> {isDeleting ? "กำลังลบ..." : "ลบ"}
      </button>
    </article>
  );
}

function RoleField({ value, disabled, canSetOwner, onChange }: { value: AdminUser["role"]; disabled: boolean; canSetOwner: boolean; onChange: (value: AdminUser["role"]) => void }) {
  const options = canSetOwner || value === "owner" ? roleOptions : roleOptions.filter((role) => role.value !== "owner");
  const isLockedOwner = value === "owner" && !canSetOwner;

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">สิทธิ์</span>
      <select
        value={value}
        disabled={disabled || isLockedOwner}
        onChange={(event) => onChange(event.target.value as AdminUser["role"])}
        className="touch-target w-full rounded-soft border border-pink-100 bg-white px-3 disabled:bg-blush disabled:text-zinc-500"
      >
        {options.map((role) => (
          <option key={role.value} value={role.value}>{role.label}</option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <input
        suppressHydrationWarning
        type={type}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="touch-target w-full rounded-soft border border-pink-100 px-3 disabled:bg-blush disabled:text-zinc-500"
        autoComplete="off"
      />
    </label>
  );
}

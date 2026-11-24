'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type Building, type BuildingUnit } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export default function BuildingsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildingForm, setBuildingForm] = useState({ name: '', city: '', address: '', managerName: '', managerPhone: '' });
  const [unitForm, setUnitForm] = useState({ unitNumber: '', floor: '', area: '', ownerName: '', residentName: '', residentPhone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBuildings(await api.get<Building[]>('/buildings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/buildings');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function open(id: string) {
    setSelected(await api.get<Building>(`/buildings/${id}`));
  }

  async function createBuilding(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingForm.name.trim()) return;
    await api.post('/buildings', {
      name: buildingForm.name.trim(),
      city: buildingForm.city.trim() || undefined,
      address: buildingForm.address.trim() || undefined,
      managerName: buildingForm.managerName.trim() || undefined,
      managerPhone: buildingForm.managerPhone.trim() || undefined,
    });
    setBuildingForm({ name: '', city: '', address: '', managerName: '', managerPhone: '' });
    await load();
    toast.success('ساختمان ثبت شد');
  }

  async function addUnit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !unitForm.unitNumber.trim()) return;
    await api.post(`/buildings/${selected.id}/units`, {
      unitNumber: unitForm.unitNumber.trim(),
      floor: unitForm.floor.trim() || undefined,
      area: unitForm.area ? Number(unitForm.area) : undefined,
      ownerName: unitForm.ownerName.trim() || undefined,
      residentName: unitForm.residentName.trim() || undefined,
      residentPhone: unitForm.residentPhone.trim() || undefined,
    });
    setUnitForm({ unitNumber: '', floor: '', area: '', ownerName: '', residentName: '', residentPhone: '' });
    await open(selected.id);
    toast.success('واحد اضافه شد');
  }

  async function toggleUnit(unit: BuildingUnit) {
    const status = unit.status === 'OCCUPIED' ? 'VACANT' : 'OCCUPIED';
    await api.patch(`/buildings/${unit.buildingId}/units/${unit.id}`, { status });
    if (selected) await open(selected.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">ساختمان‌ها و واحدها</h1>
        <p className="mt-1 text-sm text-muted">
          هر ساختمان حساب مستقل دارد؛ واحدها، مالک/مستأجر و وضعیت سکونت را اینجا مدیریت کنید.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={createBuilding} className="indeed-panel grid gap-3 p-5 md:grid-cols-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink md:col-span-3">
          <Building2 className="size-4" aria-hidden /> ساختمان جدید
        </div>
        <input className={field} placeholder="نام ساختمان" value={buildingForm.name} onChange={(e) => setBuildingForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className={field} placeholder="شهر" value={buildingForm.city} onChange={(e) => setBuildingForm((p) => ({ ...p, city: e.target.value }))} />
        <input className={field} placeholder="نشانی" value={buildingForm.address} onChange={(e) => setBuildingForm((p) => ({ ...p, address: e.target.value }))} />
        <input className={field} placeholder="نام مدیر" value={buildingForm.managerName} onChange={(e) => setBuildingForm((p) => ({ ...p, managerName: e.target.value }))} />
        <input className={field} placeholder="موبایل مدیر" value={buildingForm.managerPhone} onChange={(e) => setBuildingForm((p) => ({ ...p, managerPhone: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت ساختمان</button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : buildings.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-sm text-muted">هنوز ساختمانی ثبت نشده است.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-2">
            {buildings.map((building) => (
              <button
                key={building.id}
                type="button"
                onClick={() => void open(building.id)}
                className={`indeed-panel flex items-center justify-between p-3 text-start ${selected?.id === building.id ? 'border-brand' : ''}`}
              >
                <span>
                  <span className="block text-sm font-extrabold text-ink">{building.name}</span>
                  <span className="block text-[11px] text-muted">{building.city ?? '—'} • {building._count?.units ?? 0} واحد</span>
                </span>
              </button>
            ))}
          </div>

          <div className="indeed-panel p-4">
            {!selected ? (
              <p className="text-sm text-muted">یک ساختمان را انتخاب کنید.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-extrabold text-ink">{selected.name}</h2>
                <form onSubmit={addUnit} className="grid gap-2 sm:grid-cols-3">
                  <input className={field} placeholder="شماره واحد" value={unitForm.unitNumber} onChange={(e) => setUnitForm((p) => ({ ...p, unitNumber: e.target.value }))} required />
                  <input className={field} placeholder="طبقه" value={unitForm.floor} onChange={(e) => setUnitForm((p) => ({ ...p, floor: e.target.value }))} />
                  <input className={field} type="number" placeholder="متراژ" value={unitForm.area} onChange={(e) => setUnitForm((p) => ({ ...p, area: e.target.value }))} />
                  <input className={field} placeholder="مالک" value={unitForm.ownerName} onChange={(e) => setUnitForm((p) => ({ ...p, ownerName: e.target.value }))} />
                  <input className={field} placeholder="ساکن" value={unitForm.residentName} onChange={(e) => setUnitForm((p) => ({ ...p, residentName: e.target.value }))} />
                  <button type="submit" className="indeed-btn indeed-btn-primary">افزودن واحد</button>
                </form>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted">
                        <th className="p-2 text-start">واحد</th>
                        <th className="p-2 text-start">طبقه</th>
                        <th className="p-2 text-start">متراژ</th>
                        <th className="p-2 text-start">مالک</th>
                        <th className="p-2 text-start">ساکن</th>
                        <th className="p-2 text-start">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.units ?? []).map((unit) => (
                        <tr key={unit.id} className="border-t border-[var(--vintage-border)]">
                          <td className="p-2 text-ink">{unit.unitNumber}</td>
                          <td className="p-2">{unit.floor ?? '—'}</td>
                          <td className="p-2">{unit.area ? unit.area.toLocaleString('fa-IR') : '—'}</td>
                          <td className="p-2">{unit.ownerName ?? '—'}</td>
                          <td className="p-2">{unit.residentName ?? '—'}</td>
                          <td className="p-2">
                            <button type="button" onClick={() => void toggleUnit(unit)} className="indeed-btn py-0.5 text-[10px]">
                              {unit.status === 'OCCUPIED' ? 'ساکن' : 'خالی'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

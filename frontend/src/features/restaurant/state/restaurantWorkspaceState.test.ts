import { describe, expect, it } from 'vitest';
import {
  combineDateAndTime,
  defaultReservationForm,
  defaultSetup,
  createRestaurantWorkspaceStore,
  optionalText,
  patchRestaurantSetup,
  readStoredSelectedTableId,
  readStoredSetup,
  isGuid,
  normalizeRestaurantSetupScope,
  selectedTableStorageKey,
  setupStorageKey,
  storeSelectedTableId,
} from './restaurantWorkspaceState';

describe('restaurantWorkspaceState', () => {
  it('merges stored setup with current defaults', () => {
    expect(readStoredSetup('{"branchId":"00000000-0000-7000-8000-000000000101","serviceTime":"19:00"}')).toEqual({
      ...defaultSetup,
      branchId: '00000000-0000-7000-8000-000000000101',
      serviceTime: '19:00',
    });
  });

  it('drops non-GUID setup ids restored from local storage', () => {
    expect(
      readStoredSetup(
        JSON.stringify({
          branchId: 'branch-1',
          floorId: 'floor-1',
          floorPlanId: 'floor-plan-1',
          areaId: 'area-1',
          serviceTime: '19:00',
        }),
      ),
    ).toEqual({
      ...defaultSetup,
      serviceTime: '19:00',
    });
  });

  it('checks API identifier values with backend GUID rules', () => {
    expect(isGuid('00000000-0000-7000-8000-000000000101')).toBe(true);
    expect(isGuid('branch-1')).toBe(false);
    expect(isGuid('')).toBe(false);
  });

  it('falls back to defaults when stored setup is missing or invalid', () => {
    expect(readStoredSetup(null)).toEqual(defaultSetup);
    expect(readStoredSetup('{not-json')).toEqual(defaultSetup);
  });

  it('patches only the selected setup fields', () => {
    expect(patchRestaurantSetup(defaultSetup, { floorId: 'floor-1', areaId: '' })).toEqual({
      ...defaultSetup,
      floorId: 'floor-1',
      areaId: '',
    });
  });

  it('normalizes selected branch and floor against setup options', () => {
    const normalized = normalizeRestaurantSetupScope(
      {
        ...defaultSetup,
        branchId: '00000000-0000-7000-8000-000000000999',
        floorId: '00000000-0000-7000-8000-000000000888',
        floorPlanId: '00000000-0000-7000-8000-000000000777',
        areaId: '00000000-0000-7000-8000-000000000666',
      },
      [
        { id: '00000000-0000-7000-8000-000000000101' },
        { id: '00000000-0000-7000-8000-000000000102' },
      ],
      [
        { id: '00000000-0000-7000-8000-000000000201', branchId: '00000000-0000-7000-8000-000000000101' },
        { id: '00000000-0000-7000-8000-000000000202', branchId: '00000000-0000-7000-8000-000000000102' },
      ],
    );

    expect(normalized).toEqual({
      ...defaultSetup,
      branchId: '00000000-0000-7000-8000-000000000101',
      floorId: '00000000-0000-7000-8000-000000000201',
      floorPlanId: '',
      areaId: '',
    });
  });

  it('normalizes date, time, and optional form values for API inputs', () => {
    expect(combineDateAndTime('2026-06-09', '18:30')).toBe(new Date('2026-06-09T18:30:00').toISOString());
    expect(combineDateAndTime('2026-06-09', '')).toBe(new Date('2026-06-09T00:00:00').toISOString());
    expect(optionalText('  window seat  ')).toBe('window seat');
    expect(optionalText('   ')).toBeNull();
    expect(defaultReservationForm.partySize).toBe(2);
  });

  it('stores selected table workspace state for cross-route editor handoff', () => {
    const storage = new MemoryStorage();

    storeSelectedTableId('table-1', storage);

    expect(storage.getItem(selectedTableStorageKey)).toBe('table-1');
    expect(readStoredSelectedTableId(storage)).toBe('table-1');
  });

  it('creates a zustand workspace store that restores and persists setup patches', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      setupStorageKey,
      JSON.stringify({
        branchId: '00000000-0000-7000-8000-000000000101',
        serviceTime: '19:00',
      }),
    );

    const store = createRestaurantWorkspaceStore(storage);

    expect(store.getState().setup.branchId).toBe('00000000-0000-7000-8000-000000000101');
    expect(store.getState().setup.serviceTime).toBe('19:00');

    store.getState().patchSetup({
      floorId: '00000000-0000-7000-8000-000000000201',
    });

    expect(JSON.parse(storage.getItem(setupStorageKey) ?? '{}')).toMatchObject({
      branchId: '00000000-0000-7000-8000-000000000101',
      floorId: '00000000-0000-7000-8000-000000000201',
      serviceTime: '19:00',
    });
  });

  it('creates a zustand workspace store that persists selected table changes', () => {
    const storage = new MemoryStorage();
    const store = createRestaurantWorkspaceStore(storage);

    store.getState().setSelectedTableId('table-1');

    expect(store.getState().selectedTableId).toBe('table-1');
    expect(storage.getItem(selectedTableStorageKey)).toBe('table-1');

    store.getState().clearSelectedTableId();

    expect(store.getState().selectedTableId).toBeNull();
    expect(storage.getItem(selectedTableStorageKey)).toBeNull();
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

import { describe, expect, it } from 'vitest';
import {
  combineDateAndTime,
  defaultReservationForm,
  defaultSetup,
  optionalText,
  patchRestaurantSetup,
  readStoredSetup,
} from './restaurantWorkspaceState';

describe('restaurantWorkspaceState', () => {
  it('merges stored setup with current defaults', () => {
    expect(readStoredSetup('{"branchId":"branch-1","serviceTime":"19:00"}')).toEqual({
      ...defaultSetup,
      branchId: 'branch-1',
      serviceTime: '19:00',
    });
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

  it('normalizes date, time, and optional form values for API inputs', () => {
    expect(combineDateAndTime('2026-06-09', '18:30')).toBe(new Date('2026-06-09T18:30:00').toISOString());
    expect(combineDateAndTime('2026-06-09', '')).toBe(new Date('2026-06-09T00:00:00').toISOString());
    expect(optionalText('  window seat  ')).toBe('window seat');
    expect(optionalText('   ')).toBeNull();
    expect(defaultReservationForm.partySize).toBe(2);
  });
});

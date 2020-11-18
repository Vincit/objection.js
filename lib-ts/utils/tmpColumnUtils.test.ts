import { getTempColumn, isTempColumn } from './tmpColumnUtils';

describe('getTempColumn', () => {
  it('returns OWNER_JOIN_COLUMN_ALIAS_PREFIX with index', () => {
    expect(getTempColumn(0)).toBe('objectiontmpjoin0');
    expect(getTempColumn(1)).toBe('objectiontmpjoin1');
  });
});

describe('isTempColumn', () => {
  it('returns true', () => {
    expect(isTempColumn('objectiontmpjoin0')).toBe(true);
    expect(isTempColumn('objectiontmpjoin1')).toBe(true);
  });

  it('returns false', () => {
    expect(isTempColumn('newobjectiontmpjoin0')).toBe(false);
    expect(isTempColumn('oldobjectiontmpjoin1')).toBe(false);
    expect(isTempColumn('test')).toBe(false);
  });
});

import { isInternalProp } from './internalPropUtils';

describe('isInternalProp', () => {
  describe('when the value begins with $', () => {
    it('returns true', () => {
      expect(isInternalProp('$prop')).toBe(true);
      expect(isInternalProp('$anotherProp')).toBe(true);
    });
  });

  describe('when the value does not begin with $', () => {
    it('returns false', () => {
      expect(isInternalProp('prop')).toBe(false);
      expect(isInternalProp('anotherProp')).toBe(false);
    });
  });
});

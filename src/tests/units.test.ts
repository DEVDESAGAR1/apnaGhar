import { describe, it, expect } from 'vitest';
import { 
  toCm, 
  fromCm, 
  formatDimension, 
  parseDimensionString,
  CM_PER_INCH,
  CM_PER_FOOT,
  CM_PER_METER
} from '../utils/units';

describe('Unit Conversion Suite', () => {
  it('converts between centimeters, meters, inches, and feet accurately', () => {
    // 100 cm = 1 meter
    expect(fromCm(100, 'm', 2)).toBe(1.0);
    expect(toCm(1.0, 'm')).toBe(100.0);

    // 1 inch = 2.54 cm
    expect(toCm(1, 'in')).toBe(CM_PER_INCH);
    expect(fromCm(CM_PER_INCH, 'in', 2)).toBe(1.0);

    // 1 foot = 30.48 cm (12 inches)
    expect(toCm(1, 'ft')).toBe(CM_PER_FOOT);
    expect(fromCm(CM_PER_FOOT, 'ft', 2)).toBe(1.0);

    // Round trip fidelity
    const originalCm = 245.5;
    const inInches = fromCm(originalCm, 'in', 4);
    const backToCm = toCm(inInches, 'in');
    expect(Math.abs(backToCm - originalCm)).toBeLessThan(0.05);
  });

  it('formats dimensions with unit labels and precision', () => {
    expect(formatDimension(250, 'cm')).toBe('250 cm');
    expect(formatDimension(250, 'm')).toBe('2.5 m');
    expect(formatDimension(100, 'in')).toBe('39.4 in');
    expect(formatDimension(304.8, 'ft')).toContain('10′');
  });

  it('parses freeform user input strings across units', () => {
    expect(parseDimensionString('250cm')).toBe(250);
    expect(parseDimensionString('2.5m')).toBe(250);
    expect(parseDimensionString('36"')).toBe(Math.round(36 * CM_PER_INCH * 10) / 10);
    expect(parseDimensionString('36in')).toBe(Math.round(36 * CM_PER_INCH * 10) / 10);
    expect(parseDimensionString('5ft 10in')).toBe(Math.round((5 * CM_PER_FOOT + 10 * CM_PER_INCH) * 10) / 10);
    expect(parseDimensionString('5\'10"')).toBe(Math.round((5 * CM_PER_FOOT + 10 * CM_PER_INCH) * 10) / 10);
    expect(parseDimensionString('invalid text')).toBeNull();
    expect(parseDimensionString('')).toBeNull();
  });
});

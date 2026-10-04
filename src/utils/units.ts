import type { UnitType } from '../types/model';

/**
 * Pure Unit Conversion Utilities
 * Canonical unit inside the engine is ALWAYS Centimeters (cm).
 */

export const CM_PER_INCH = 2.54;
export const CM_PER_FOOT = 30.48; // 12 * 2.54
export const CM_PER_METER = 100.0;

/**
 * Convert canonical cm value to the requested display unit
 */
export function fromCm(valueCm: number, targetUnit: UnitType, precision: number = 1): number {
  if (!Number.isFinite(valueCm)) return 0;
  
  let converted = valueCm;
  switch (targetUnit) {
    case 'cm':
      converted = valueCm;
      break;
    case 'm':
      converted = valueCm / CM_PER_METER;
      break;
    case 'in':
      converted = valueCm / CM_PER_INCH;
      break;
    case 'ft':
      converted = valueCm / CM_PER_FOOT;
      break;
  }
  const factor = Math.pow(10, precision);
  return Math.round(converted * factor) / factor;
}

/**
 * Convert any value in targetUnit to canonical cm
 */
export function toCm(value: number, sourceUnit: UnitType): number {
  if (!Number.isFinite(value)) return 0;

  switch (sourceUnit) {
    case 'cm':
      return Math.round(value * 100) / 100;
    case 'm':
      return Math.round(value * CM_PER_METER * 100) / 100;
    case 'in':
      return Math.round(value * CM_PER_INCH * 100) / 100;
    case 'ft':
      return Math.round(value * CM_PER_FOOT * 100) / 100;
  }
}

/**
 * Format a canonical cm value for display with appropriate suffix
 */
export function formatDimension(
  valueCm: number, 
  unit: UnitType, 
  includeUnitLabel: boolean = true
): string {
  if (!Number.isFinite(valueCm)) return '-';
  
  const precision = unit === 'm' || unit === 'ft' ? 2 : 1;
  const num = fromCm(valueCm, unit, precision);

  if (unit === 'ft') {
    // Also provide ft'in" if desired
    const totalInches = valueCm / CM_PER_INCH;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    if (includeUnitLabel) {
      return `${feet}′ ${inches}″ (${num} ft)`;
    }
    return `${num}`;
  }

  const label = includeUnitLabel ? ` ${unit}` : '';
  return `${num}${label}`;
}

/**
 * Robust string parser for user input:
 * Supports:
 * - "250" or "250cm"
 * - "2.5m"
 * - "60in" or '60"'
 * - "5ft 10in" or "5'10" or "5' 10\""
 * Returns value in canonical centimeters (cm).
 */
export function parseDimensionString(input: string, fallbackUnit: UnitType = 'cm'): number | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check for feet/inches pattern like 5'10" or 5ft 10in
  const ftInMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inches)?)?$/i);
  if (ftInMatch) {
    const feet = parseFloat(ftInMatch[1]);
    const inches = ftInMatch[2] ? parseFloat(ftInMatch[2]) : 0;
    if (!Number.isNaN(feet)) {
      return Math.round((feet * CM_PER_FOOT + inches * CM_PER_INCH) * 10) / 10;
    }
  }

  // Check for inches quote like 48"
  const inMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inches)$/i);
  if (inMatch) {
    const val = parseFloat(inMatch[1]);
    return Math.round(val * CM_PER_INCH * 10) / 10;
  }

  // Check for meter like 2.4m
  const mMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:m|meters|metre)$/i);
  if (mMatch) {
    const val = parseFloat(mMatch[1]);
    return Math.round(val * CM_PER_METER * 10) / 10;
  }

  // Check for cm like 240cm
  const cmMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:cm|centimeters)?$/i);
  if (cmMatch) {
    const val = parseFloat(cmMatch[1]);
    if (!Number.isNaN(val)) {
      // If no unit suffix was found in match group, convert from fallbackUnit
      if (/cm/i.test(trimmed)) {
        return Math.round(val * 10) / 10;
      }
      return toCm(val, fallbackUnit);
    }
  }

  const rawNum = parseFloat(trimmed);
  if (!Number.isNaN(rawNum)) {
    return toCm(rawNum, fallbackUnit);
  }

  return null;
}

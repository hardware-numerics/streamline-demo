/**
 * Unit system used by the physical model.
 *
 * We use CGS as the canonical system.
 *
 * Length:
 *   cm
 *
 * Magnetic field:
 *   gauss
 *
 * The current convention is inherited from
 * the original Python model, where the
 * filament strength is expressed through
 * current_over_c.
 */

export interface CGSUnits {

  /**
   * How many centimeters correspond
   * to one Three.js coordinate unit.
   *
   * Example:
   *
   *   lengthCm = 1
   *
   * means
   *
   *   1 Three.js unit = 1 cm
   */
  lengthCm: number;
}


export const defaultCGS: CGSUnits = {
  lengthCm: 1.0,
};


/**
 * Convert a Three.js coordinate into cm.
 */
export function visualToCm(
  value: number,
  units: CGSUnits
): number {

  return value * units.lengthCm;
}


/**
 * Convert cm into a Three.js coordinate.
 */
export function cmToVisual(
  valueCm: number,
  units: CGSUnits
): number {

  return valueCm / units.lengthCm;
}


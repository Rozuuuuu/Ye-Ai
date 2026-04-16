/**
 * One-Euro Filter
 * 
 * An adaptive low-pass filter that balances responsiveness and smoothness.
 * - High velocity  → higher cutoff → responsive (follows fast movement)
 * - Low velocity   → lower cutoff  → smooth (filters out jitter)
 * 
 * Based on: https://cristal.univ-lille.fr/~casiez/1euro/
 * 
 * @param {number} minCutoff  - Minimum cutoff frequency (lower = more smooth). Default 1.0
 * @param {number} beta       - Speed coefficient (higher = more responsive). Default 0.0
 * @param {number} dCutoff    - Derivative cutoff frequency. Default 1.0
 */
export class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = 0.0;
    this.tPrev = null;
  }

  _smoothingFactor(te, cutoff) {
    const r = 2 * Math.PI * cutoff * te;
    return r / (r + 1);
  }

  _exponentialSmoothing(a, x, xPrev) {
    return a * x + (1 - a) * xPrev;
  }

  filter(x, timestamp) {
    if (this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      return x;
    }

    const te = timestamp - this.tPrev; // time elapsed in seconds
    if (te <= 0) return this.xPrev;    // guard against zero/negative delta

    // Estimate derivative (velocity)
    const dx = (x - this.xPrev) / te;
    const edx = this._smoothingFactor(te, this.dCutoff);
    const dxHat = this._exponentialSmoothing(edx, dx, this.dxPrev);

    // Adaptive cutoff based on velocity
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);

    // Apply filter
    const ex = this._smoothingFactor(te, cutoff);
    const xHat = this._exponentialSmoothing(ex, x, this.xPrev);

    // Store for next iteration
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = timestamp;

    return xHat;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0.0;
    this.tPrev = null;
  }
}

/**
 * Creates a set of 3 One-Euro Filters for X, Y, Z coordinates.
 */
export function createPositionFilters(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
  return {
    x: new OneEuroFilter(minCutoff, beta, dCutoff),
    y: new OneEuroFilter(minCutoff, beta, dCutoff),
    z: new OneEuroFilter(minCutoff, beta, dCutoff),
  };
}

/**
 * Creates a single One-Euro Filter for scalar values (scale, angle).
 */
export function createScalarFilter(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
  return new OneEuroFilter(minCutoff, beta, dCutoff);
}

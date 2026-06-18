// Pure helper for the range slider: order the two handles, clamp them to the
// domain, and snap each to the nearest step (measured from the domain min).
// Inputs at or beyond a domain bound snap exactly to that bound, so the full
// domain stays reachable even when step does not divide the span.
export function clampRange([lo, hi], domain, step = 1) {
  const [dMin, dMax] = domain;
  const snap = (v) => {
    if (v <= dMin) return dMin;
    if (v >= dMax) return dMax;
    const snapped = dMin + Math.round((v - dMin) / step) * step;
    return Math.max(dMin, Math.min(dMax, snapped));
  };
  let a = snap(lo);
  let b = snap(hi);
  if (a > b) [a, b] = [b, a];
  return [a, b];
}

import TimeWidget from "time-widget";
import ReactiveWidget from "reactive-widget-helper";

/**
 * Wraps TimeWidget as a reactive-widget-helper widget.
 *
 * Usage in Observable Framework:
 *   const selectedGroups = view(await timeWidgetReactive(data, {
 *     x: d => d.gestasal,
 *     y: d => d.peso,
 *     yLabel: "Peso (g)",
 *     xLabel: "Edad gestacional (semanas)",
 *   }));
 *   // selectedGroups updates reactively when the user brushes a time range
 *
 * @param {Array} data - Array of patient records
 * @param {Object} options - TimeWidget options (x, y, id, referenceCurves, etc.)
 * @returns {HTMLElement} Reactive widget element
 */
export function timeWidgetReactive(data, options = {}) {
  const container = document.createElement("div");
  let currentGroups = [];
  let rw;

  const widget = new TimeWidget(data, {
    target: container,
    updateCallback: (groups) => {
      currentGroups = groups;
      if (rw) rw.setValue(groups);
    },
    ...options,
  });

  rw = ReactiveWidget(container, currentGroups, {
    setValue: (groups) => {
      currentGroups = groups;
    },
  });

  return rw;
}

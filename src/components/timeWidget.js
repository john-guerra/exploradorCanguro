// TimeWidget is vendored as a built ESM bundle (see src/lib/) rather than
// imported from `time-widget` directly: Observable Framework's Rollup-based
// bundler cannot resolve a symlinked `file:` dependency, and the sibling repo
// would not exist on a deploy/CI machine. Refresh it with `npm run sync:timewidget`.
import TimeWidget from "../lib/TimeWidget.esm.js";
import ReactiveWidget from "reactive-widget-helper";

/**
 * Wraps TimeWidget as a reactive-widget-helper widget so it behaves like an
 * Observable input: it holds a `value` (the current brush selection) and
 * dispatches "input" events when that selection changes.
 *
 * Pattern reference: https://johnguerra.co/reactiveWidgets (IEEE VIS 2024).
 *
 * Usage in Observable Framework:
 *   const tw = timeWidgetReactive(data, {
 *     x: "__time",        // attribute name (string) OR accessor function
 *     y: "peso",
 *     id: "Code",
 *     groupAttr: "ERN_Sexo",
 *     renderer: "canvas",
 *   });
 *   tw.ts.addReferenceCurves(curves);   // optional: overlay growth curves
 *   const selected = view(tw);          // reactive: updates on brush change
 *
 * @param {Array<Object>} data - One row per (id, time) observation.
 * @param {Object} options - TimeWidget options (x, y, id, groupAttr, ...).
 *   See ../TimeWidget/src/TimeWidget.js for the full option list.
 * @returns {HTMLElement} The TimeWidget element, enhanced with reactive
 *   `value` / `setValue` and a `.ts` handle for advanced control.
 */
export function timeWidgetReactive(data, options = {}) {
  const container = document.createElement("div");

  // Enhance the container FIRST so `container.setValue` exists before TimeWidget
  // can fire its first update. `showValue` is a no-op because TimeWidget owns
  // and re-renders its own DOM — there is nothing extra for us to redraw.
  const widget = ReactiveWidget(container, { value: [], showValue: () => {} });

  // TimeWidget is a plain function (NOT a constructor). It renders into `target`
  // and returns that same element augmented with a `.ts` control handle, so
  // `widget.ts` is available after this call.
  TimeWidget(data, {
    target: container,
    updateCallback: (selected) => widget.setValue(selected),
    ...options,
  });

  return widget;
}

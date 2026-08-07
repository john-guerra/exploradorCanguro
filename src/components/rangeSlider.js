import * as d3 from "d3";
import ReactiveWidget from "reactive-widget-helper";
import { clampRange } from "./rangeSliderUtils.js";

/**
 * Dual-handle range slider as a reactive-widget-helper widget.
 * value is [lo, hi]; emits "input" on change. orientation "vertical" puts the
 * larger value at the top (matching a chart's y-axis).
 */
export function rangeSlider({
  domain,
  value = domain,
  step = 1,
  orientation = "horizontal",
  length = 320,
  thickness = 44,
  // End padding (px) so handles aren't clipped. Set 0 to make the track span the
  // exact `length` (e.g. to lay it precisely over a chart axis).
  pad = 14,
  // Text label + value readout above the track. Pass null to render no label at
  // all (just the track + handles), e.g. when overlaying an axis.
  label = "",
  format = (d) => `${Math.round(d)}`,
} = {}) {
  const horizontal = orientation === "horizontal";
  const span = length - pad * 2;
  const cross = thickness / 2;

  // data -> px along the main axis (vertical: max value at top)
  const scale = d3
    .scaleLinear()
    .domain(domain)
    .range(horizontal ? [pad, pad + span] : [pad + span, pad])
    .clamp(true);

  const container = document.createElement("div");
  container.className = "range-slider";

  let labelEl = null;
  if (label !== null) {
    labelEl = document.createElement("div");
    labelEl.className = "range-slider-label";
    labelEl.style.font = "12px sans-serif";
    labelEl.style.marginBottom = "2px";
    container.appendChild(labelEl);
  }

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", horizontal ? length : thickness)
    .attr("height", horizontal ? thickness : length)
    .style("overflow", "visible");

  const line = (cls, color, w) =>
    svg.append("line").attr("class", cls).attr("stroke", color)
      .attr("stroke-width", w).attr("stroke-linecap", "round");

  line("track", "#ccc", 4)
    .attr("x1", horizontal ? pad : cross).attr("y1", horizontal ? cross : pad)
    .attr("x2", horizontal ? pad + span : cross).attr("y2", horizontal ? cross : pad + span);
  const rangeLine = line("range", "#4682b4", 4);

  const handle = () =>
    svg.append("circle").attr("r", 8).attr("fill", "#fff")
      .attr("stroke", "#4682b4").attr("stroke-width", 2)
      .style("cursor", horizontal ? "ew-resize" : "ns-resize");
  const loHandle = handle();
  const hiHandle = handle();

  function place(h, v) {
    if (horizontal) h.attr("cx", scale(v)).attr("cy", cross);
    else h.attr("cx", cross).attr("cy", scale(v));
  }

  function render() {
    const [lo, hi] = widget.value;
    place(loHandle, lo);
    place(hiHandle, hi);
    if (horizontal) {
      rangeLine.attr("x1", scale(lo)).attr("y1", cross).attr("x2", scale(hi)).attr("y2", cross);
    } else {
      rangeLine.attr("x1", cross).attr("y1", scale(lo)).attr("x2", cross).attr("y2", scale(hi));
    }
    if (labelEl) labelEl.textContent = `${label ? label + ": " : ""}${format(lo)} – ${format(hi)}`;
  }

  const widget = ReactiveWidget(container, {
    value: clampRange(value, domain, step),
    showValue: render,
  });

  function drag(which) {
    return d3.drag().on("drag", (event) => {
      const v = scale.invert(horizontal ? event.x : event.y);
      let [lo, hi] = widget.value;
      if (which === "lo") lo = v;
      else hi = v;
      widget.setValue(clampRange([lo, hi], domain, step));
    });
  }
  loHandle.call(drag("lo"));
  hiHandle.call(drag("hi"));

  render();
  return widget;
}

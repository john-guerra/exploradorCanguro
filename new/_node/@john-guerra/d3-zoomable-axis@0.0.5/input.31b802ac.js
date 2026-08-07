import{create as st}from"../../d3-selection@3.0.0/index.13204b25.js";import{scaleLinear as rt}from"../../d3-scale@4.0.2/index.d84d3d65.js";import{axisRight as lt,axisLeft as ut,axisTop as ct,axisBottom as pt}from"../../d3-axis@3.0.0/index.34ded868.js";import{dispatch as dt}from"../../d3-dispatch@3.0.1/index.be49ca5f.js";import{area as xe,curveMonotoneX as Le,curveMonotoneY as Ce,curveStep as ht,curveLinear as mt,curveCatmullRom as xt,curveNatural as bt,curveBasis as gt}from"../../d3-shape@3.2.0/index.d124f030.js";import zt from"../../reactive-widget-helper@0.0.3/index.cad252d0.js";import{density1d as ft}from"../../fast-kde@0.2.2/index.5275d247.js";function qe(l,i,x=1){const E=+i[0],z=+i[1];if(l=+l,l<=E)return E;if(l>=z)return z;if(!x)return l;const v=E+Math.round((l-E)/x)*x;return Math.max(E,Math.min(z,v))}function be([l,i],x,E=1){let z=qe(l,x,E),v=qe(i,x,E);return z>v&&([z,v]=[v,z]),[z,v]}function vt(l,i){return!i||typeof l.nice!="function"?l:i===!0?l.nice():l.nice(i)}function Qe(l,i,x){const[E,z]=i,[v,h]=x;return z===E?v:v+(h-v)*(l-E)/(z-E)}function yt({domain:l,range:i,value:x}){return{loPx:Qe(x[0],l,i),hiPx:Qe(x[1],l,i)}}const $t={bottom:pt,top:ct,left:ut,right:lt},re=l=>String(l).padStart(2,"0");function wt(l,i){if(i==="number")return String(Math.round(l*1e3)/1e3);const x=new Date(l),E=`${x.getFullYear()}-${re(x.getMonth()+1)}-${re(x.getDate())}`,z=`${re(x.getHours())}:${re(x.getMinutes())}:${re(x.getSeconds())}`;return i==="date"?E:i==="time"?z:`${E}T${z}`}function kt(l,i){return i==="number"?+l:l?new Date(i==="date"?`${l}T00:00`:l).getTime():NaN}let Et=0;const Mt={basis:gt,natural:bt,catmullRom:xt,linear:mt,step:ht},Lt=[["basis","Basis"],["natural","Natural"],["monotone","Monotone"],["catmullRom","Catmull-Rom"],["linear","Linear"],["step","Step"]],Ct=[["area","Area (sparkline)"],["violin","Violin"],["histogram","Histogram"]],At=["type","curve","adjust","pad","bins","size","direction"];function St(l){if(!l||typeof localStorage>"u")return null;try{const i=JSON.parse(localStorage.getItem(l)??"null");return i&&typeof i=="object"?i:null}catch{return null}}function Nt(l,i){if(!(!l||typeof localStorage>"u"))try{localStorage.setItem(l,JSON.stringify(i))}catch{}}let Ue=!1;function Pt(){if(Ue||typeof document>"u")return;Ue=!0;const l=`
.zoomable-axis-input { position: relative; font: 10px sans-serif; --za-accent: #4682b4; z-index: 0;
  -webkit-user-select: none; user-select: none; }
.zoomable-axis-input:focus-within { z-index: 10; }
/* Axis is decorative: never selectable, never intercepts a drag (so dragging
   across the tick labels pans/resizes instead of selecting their text). */
.zoomable-axis-input .za-axis { pointer-events: none; }
.zoomable-axis-input .za-axis path,
.zoomable-axis-input .za-axis line { stroke: #bbb; }
/* The double-click value editor is a real text field \u2014 re-enable selection. */
.zoomable-axis-input input { -webkit-user-select: text; user-select: text; }
/* Axis range inputs (the two brush handles) \u2014 pointer-inert, invisible; keyboard
   + a11y only. Scoped to .za-axis-range so the settings panel's real sliders keep
   their normal appearance. */
.zoomable-axis-input input.za-axis-range {
  position: absolute; margin: 0; background: transparent; pointer-events: none;
  -webkit-appearance: none; appearance: none;
}
.zoomable-axis-input input.za-axis-range:focus { outline: none; }
.zoomable-axis-input input.za-axis-range::-webkit-slider-thumb {
  -webkit-appearance: none; pointer-events: none;
  height: 20px; width: 20px; opacity: 0;
}
.zoomable-axis-input input.za-axis-range::-moz-range-thumb {
  pointer-events: none; height: 20px; width: 20px; opacity: 0;
}
/* \u2500\u2500 Scent settings popover (opt-in via scent.controls) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Neutral dark defaults; accents pick up --za-accent so it themes with the rest.
   Overridable variables let a consumer restyle without patching the library. */
.zoomable-axis-input .za-gear {
  position: absolute; top: -2px; right: 2px; z-index: 6;
  width: 18px; height: 18px; padding: 0; border: none; border-radius: 4px;
  background: transparent; color: var(--za-gear, #6f6f6f);
  font-size: 12px; line-height: 18px; cursor: pointer;
}
.zoomable-axis-input .za-gear:hover, .zoomable-axis-input .za-gear.on {
  color: var(--za-gear-on, #d8d8d8); background: var(--za-panel-hover, #2c2c2c);
}
.zoomable-axis-input .za-scent-panel {
  position: absolute; top: 18px; right: 0; z-index: 30; width: 224px;
  box-sizing: border-box; background: var(--za-panel-bg, #1e1e1e);
  border: 1px solid var(--za-panel-border, #383838); border-radius: 8px;
  padding: 10px; box-shadow: 0 10px 28px rgba(0,0,0,.45);
  display: flex; flex-direction: column; gap: 7px;
  -webkit-user-select: none; user-select: none;
}
.zoomable-axis-input .za-scent-panel[hidden] { display: none; }
.zoomable-axis-input .za-row { display: flex; align-items: center; gap: 8px; font-size: .72rem; }
.zoomable-axis-input .za-row > label { width: 58px; flex-shrink: 0; color: var(--za-panel-label, #9a9a9a); }
.zoomable-axis-input .za-row select {
  flex: 1; min-width: 0; background: var(--za-panel-field, #101010);
  border: 1px solid var(--za-panel-border, #333); color: var(--za-panel-fg, #cfcfcf);
  border-radius: 4px; padding: 2px 4px; font-size: .72rem;
}
.zoomable-axis-input .za-range { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.zoomable-axis-input .za-range input[type=range] {
  flex: 1; min-width: 0; accent-color: var(--za-accent); pointer-events: auto;
}
.zoomable-axis-input .za-val {
  width: 36px; flex-shrink: 0; text-align: right;
  color: var(--za-panel-label, #9a9a9a); font-variant-numeric: tabular-nums;
}
.zoomable-axis-input .za-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 2px; }
.zoomable-axis-input .za-actions button {
  border: 1px solid var(--za-panel-border, #444); background: transparent;
  color: var(--za-panel-fg, #cfcfcf); border-radius: 5px; padding: 3px 12px;
  font-size: .72rem; cursor: pointer;
}
.zoomable-axis-input .za-actions .za-done {
  background: var(--za-accent); border-color: var(--za-accent);
  color: var(--za-panel-bg, #06121f); font-weight: 600;
}
/* \u2500\u2500 Musical-note / p-shape handles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   SVG layer: tick (value marker) + stem (connecting line). pointer-events:none
   on the SVG itself; individual .za-handle groups set pointer-events:all so
   the tick+stem area is directly grabbable for drag. */
.zoomable-axis-input .za-handles-svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; z-index: 3; }
.zoomable-axis-input .za-handle { cursor: grab; }
.zoomable-axis-input .za-handle:active,
.zoomable-axis-input .za-handle.za-dragging { cursor: grabbing; }
/* All range elements share one color (--za-accent): pill, band, and handles.
   Shape \u2014 not hue \u2014 distinguishes them, so the widget stays visually calm. */
.zoomable-axis-input .za-handle .za-handle-tick { stroke: var(--za-accent); stroke-width: 2; stroke-linecap: round; }
.zoomable-axis-input .za-handle .za-handle-stem { stroke: var(--za-accent); stroke-width: 1.5; }
/* Knob: the half-disc grab affordance at each endpoint \u2014 the only place an
   endpoint drag starts. A soft translucent ring delineates it without shouting. */
.zoomable-axis-input .za-handle .za-knob { fill: var(--za-accent); stroke: rgba(255,255,255,.7); stroke-width: 1.25; }
.zoomable-axis-input .za-handle:hover .za-knob { fill: color-mix(in srgb, var(--za-accent) 82%, #fff); }
.zoomable-axis-input .za-handle.focused .za-handle-tick,
.zoomable-axis-input .za-handle.focused .za-handle-stem { stroke-width: 3; filter: drop-shadow(0 0 3px var(--za-accent)); }
.zoomable-axis-input .za-handle.focused .za-knob,
.zoomable-axis-input .za-handle.za-dragging .za-knob { stroke-width: 2; filter: drop-shadow(0 0 3px var(--za-accent)); }
/* Pan HIT AREA \u2014 a big, easy-to-grab layer spanning the selection interior and
   full body height. z-index 2 keeps it above the pointer-inert inputs so the
   region between the knobs reliably grabs to pan. It is transparent/translucent
   so it never tints the sparkline beneath. */
.zoomable-axis-input .za-selected { position: absolute; z-index: 2; background: var(--za-accent); opacity: .12; cursor: move; }
.zoomable-axis-input .za-selected:active { cursor: grabbing; }
/* Scented widgets have a separate visible marker (.za-band-line), so the hit
   layer is fully transparent \u2014 a pure grab zone that muddies no colors. */
.zoomable-axis-input .za-selected.za-thin { background: transparent; opacity: 1; }
.zoomable-axis-input .za-band-line { position: absolute; background: var(--za-accent); opacity: .9; pointer-events: none; border-radius: 1px; }
/* Badge: pill-shaped note head at the tip of the stem. Draggable, double-click to edit. */
.zoomable-axis-input .za-value {
  position: absolute; z-index: 4;
  pointer-events: auto; cursor: grab;
  font: 700 10px/1 "SFMono-Regular","Menlo","Monaco",ui-monospace,monospace;
  background: var(--za-accent); color: #fff;
  padding: 4px 8px; border-radius: 10px; white-space: nowrap;
  -webkit-user-select: none; user-select: none;
  box-shadow: 0 1px 4px rgba(0,0,0,.18);
  transition: box-shadow .15s;
}
.zoomable-axis-input .za-value:hover { box-shadow: 0 2px 8px rgba(0,0,0,.25); }
.zoomable-axis-input .za-value.za-dragging,
.zoomable-axis-input .za-value:active { cursor: grabbing; box-shadow: 0 4px 12px rgba(0,0,0,.28); transition: none; }
.zoomable-axis-input .za-value.za-focused { outline: 2px solid var(--za-accent); outline-offset: 2px; }
.zoomable-axis-input .za-value.za-editing {
  cursor: text; background: #fff; color: var(--za-accent);
  padding: 3px 7px; border: 1.5px solid var(--za-accent);
}
.zoomable-axis-input .za-value.za-editing input {
  border: none; outline: none; background: transparent;
  font: inherit; color: inherit; width: 5em; padding: 0; margin: 0;
  pointer-events: auto; cursor: text;
}
`,i=document.createElement("style");i.textContent=l,document.head.appendChild(i)}function Dt(l,{orient:i="bottom",step:x=1,value:E,length:z=320,thickness:v=44,margin:h=22,label:Ae="",units:te="",ticks:Se=null,nice:He=!1,inputType:U="number",format:ge=ae=>`${Math.round(ae)}`,scent:H=null}={}){const ae=!!(H&&H.values&&H.values.length);Pt();const b=i==="bottom"||i==="top",W=i==="top"||i==="right"?h:h+v/2,M=(typeof l=="function"?l.copy():rt().domain(l)).range(b?[0,z]:[z,0]);vt(M,He);const[O,X]=M.domain().map(Number),G=dt("start","input","end","scent"),ze=H&&H.persistKey;let S=ae?{...H}:null;if(S){const e=St(ze);e&&(S={...S,...e})}function We(e){return typeof e=="function"?e:e==="monotone"?b?Le:Ce:typeof e=="string"&&Mt[e]||null}let g=be(E||[O,X],[O,X],x),fe=[],le=null,oe=24,ve="var(--za-accent)",ue="#cbd5e1";const K=st("div").attr("class","zoomable-axis-input").attr("role","group").attr("aria-label",`${Ae||"value"} range`).style("width",`${(b?z:v)+h*2}px`).style("height",`${(b?v:z)+h*2}px`),D=K.node(),Ne=K.append("svg").attr("class","za-axis").attr("aria-hidden","true").attr("width",D.style.width).attr("height",D.style.height).style("position","absolute").style("left",0).style("top",0).style("overflow","visible").style("pointer-events","none"),Pe=Ne.append("g").attr("class","za-scent-host");ae&&Ye(Pe,S);const De=Ne.append("g").attr("transform",b?`translate(${h},${i==="top"?h:h+v/2})`:`translate(${i==="right"?h:h+v/2},${h})`),je=$t[i](M).tickSizeOuter(0);Se!=null&&je.ticks(Se),De.call(je);const Y=10,ce=14,_e=K.append("svg").attr("class","za-handles-svg").attr("aria-hidden","true").attr("width",D.style.width).attr("height",D.style.height).append("g").attr("class","za-handles").attr("transform",De.attr("transform")),_=8,Te=()=>{const e=_e.append("g").attr("class","za-handle").attr("pointer-events","all");return e.append("line").attr("class","za-handle-stem"),e.append("line").attr("class","za-handle-tick"),e.append("path").attr("class","za-knob"),e},Je=(e,t)=>b?`M ${e} ${-_} A ${_} ${_} 0 0 ${t>0?1:0} ${e} ${_} Z`:`M ${-_} ${e} A ${_} ${_} 0 0 ${t>0?0:1} ${_} ${e} Z`,Be=Math.sign(M.range()[1]-M.range()[0])||1,pe=Te(),de=Te();function Ie(e,t,n){let r,o,c,s,u,p,d,m;if(b){r=t,o=-Y,c=t,s=Y;const f=i==="bottom"?1:-1;u=t,p=f*Y,d=t,m=f*(Y+ce)}else{r=-Y,o=t,c=Y,s=t;const f=i==="left"?-1:1;u=f*Y,p=t,d=f*(Y+ce),m=t}e.select(".za-handle-tick").attr("x1",r).attr("y1",o).attr("x2",c).attr("y2",s),e.select(".za-handle-stem").attr("x1",u).attr("y1",p).attr("x2",d).attr("y2",m);const k=n==="hi"?Be:-Be;e.select(".za-knob").attr("d",Je(t,k))}const L=K.append("div").attr("class",ae?"za-selected za-thin":"za-selected").node(),Z=ae?K.append("div").attr("class","za-band-line").node():null,ie=16,Fe=e=>{const t=document.createElement("input");if(t.type="range",t.className="za-axis-range",t.min=O,t.max=X,t.step=x||"any",t.setAttribute("aria-label",`${e==="lo"?"Minimum":"Maximum"} ${Ae||"value"}`),t.setAttribute("aria-orientation",b?"horizontal":"vertical"),t.style.width=`${z}px`,t.style.height=`${ie}px`,b)t.style.left=`${h}px`,t.style.top=`${h+v/2-ie/2}px`;else{const n=h+v/2+ie/2,r=ie;t.style.left="0",t.style.top=`${z-v/2-3*ie/2}px`,t.style.transformOrigin=`${n}px ${r}px`,t.style.transform="rotate(-90deg)"}return K.node().appendChild(t),t.addEventListener("input",n=>$e(e,n.isTrusted)),t},J=Fe("lo"),ee=Fe("hi");J.addEventListener("focus",()=>{pe.classed("focused",!0),T.classList.add("za-focused")}),J.addEventListener("blur",()=>{pe.classed("focused",!1),T.classList.remove("za-focused")}),ee.addEventListener("focus",()=>{de.classed("focused",!0),B.classList.add("za-focused")}),ee.addEventListener("blur",()=>{de.classed("focused",!1),B.classList.remove("za-focused")});const Re=()=>{const e=document.createElement("div");return e.className="za-value",K.node().appendChild(e),e},T=Re(),B=Re(),et=3;function he(e,t,n=!1){const r=t==="lo"?J:ee,o=M.range(),c=(X-O)/(o[o.length-1]-o[0]);(e.node?e.node():e).addEventListener("pointerdown",s=>{if(s.button!==0)return;n&&(s.preventDefault(),r.focus({preventScroll:!0}));const u=b?s.clientX:s.clientY,p=g[t==="lo"?0:1];let d=!1;const m=f=>{const C=(b?f.clientX:f.clientY)-u;if(!d){if(Math.abs(C)<et)return;d=!0,e.classed?e.classed("za-dragging",!0):e.classList.add("za-dragging"),G.call("start",D,g.slice())}f.preventDefault();let $=p+C*c;$=t==="lo"?Math.max(O,Math.min(g[1],$)):Math.max(g[0],Math.min(X,$)),r.value=$,$e(t,!0)},k=()=>{document.removeEventListener("pointermove",m),document.removeEventListener("pointerup",k),d&&(e.classed?e.classed("za-dragging",!1):e.classList.remove("za-dragging"),G.call("end",D,g.slice()))};document.addEventListener("pointermove",m),document.addEventListener("pointerup",k)})}function Ve(e,t){e.addEventListener("dblclick",n=>{n.stopPropagation();const r=g[t==="lo"?0:1];e.classList.add("za-editing");const o=document.createElement("input");o.type=U,o.value=wt(r,U),U==="number"?o.step=x:U!=="date"&&(o.step=1),o.style.width=U==="number"?"5em":U==="date"?"8.5em":U==="time"?"7em":"13em",e.textContent="",e.appendChild(o),o.focus(),o.select&&o.select();const c=()=>{const s=kt(o.value,U),u=Math.max(O,Math.min(X,Number.isFinite(s)?s:r));e.classList.remove("za-editing");const p=t==="lo"?J:ee;p.value=u,$e(t,!0)};o.addEventListener("keydown",s=>{s.key==="Enter"&&(s.preventDefault(),c()),s.key==="Escape"&&(e.classList.remove("za-editing"),se())}),o.addEventListener("blur",()=>c())})}he(pe,"lo",!0),he(de,"hi",!0),he(T,"lo"),he(B,"hi"),Ve(T,"lo"),Ve(B,"hi");function tt(){J.setAttribute("aria-valuetext",`${ge(g[0])}${te?" "+te:""}`),ee.setAttribute("aria-valuetext",`${ge(g[1])}${te?" "+te:""}`)}function se(){J.value=g[0],ee.value=g[1],tt();const e=yt({domain:[O,X],range:b?[0,z]:[z,0],value:g}),t=2,n=10,r=Math.min(e.loPx,e.hiPx),o=Math.max(e.loPx,e.hiPx),c=r+t,s=o-r-2*t;if(s<n?L.style.display="none":(L.style.display="block",b?(L.style.left=`${h+c}px`,L.style.top=`${h}px`,L.style.width=`${s}px`,L.style.height=`${v}px`):(L.style.left=`${h}px`,L.style.top=`${h+c}px`,L.style.width=`${v}px`,L.style.height=`${s}px`)),Z){const p=Math.min(e.loPx,e.hiPx),d=Math.max(e.loPx,e.hiPx),m=3;b?(Z.style.left=`${h+p}px`,Z.style.top=`${W-m/2}px`,Z.style.width=`${d-p}px`,Z.style.height=`${m}px`):(Z.style.left=`${W-m/2}px`,Z.style.top=`${h+p}px`,Z.style.width=`${m}px`,Z.style.height=`${d-p}px`)}Ie(pe,e.loPx,"lo"),Ie(de,e.hiPx,"hi");const u=p=>`${ge(p)}${te?" "+te:""}`;if(T.textContent=u(g[0]),B.textContent=u(g[1]),b){const p=i==="bottom"?1:-1,d=`${W+p*(Y+ce)}px`,m=p>0?"translate(-50%, 0)":"translate(-50%, -100%)",k=T.offsetWidth||50,f=B.offsetWidth||50,C=6;let $=h+e.loPx,A=h+e.hiPx;const N=(k+f)/2+C;if(A-$<N){const j=($+A)/2;$=j-N/2,A=j+N/2}T.style.transform=B.style.transform=m,T.style.left=`${$}px`,T.style.top=d,B.style.left=`${A}px`,B.style.top=d}else{const p=i==="left"?-1:1,d=`${W+p*(Y+ce)}px`,m=p<0?"translate(-100%, -50%)":"translate(0, -50%)",k=z+h*2,f=T.offsetHeight||18,C=B.offsetHeight||18,$=Math.max(f/2,Math.min(k-f/2,h+e.loPx)),A=Math.max(C/2,Math.min(k-C/2,h+e.hiPx));T.style.transform=B.style.transform=m,T.style.left=d,T.style.top=`${$}px`,B.style.left=d,B.style.top=`${A}px`}ye()}function Ye(e,t){const{values:n,type:r="histogram",bins:o=30,size:c=24,color:s="#cbd5e1",colorSelected:u,direction:p,side:d,style:m,bandwidth:k,adjust:f,pad:C,curve:$}=t;e.selectAll("*").remove(),fe=[],le=null;const A=We($);ue=s,ve=u||"var(--za-accent)",oe=c;const N=p??d??(r==="area"?"in":"out"),j=(r==="violin"||r==="area")&&(m??"kde")==="kde",[I,a]=M.domain().map(Number);if(j){at(e,n,{type:r,nBins:o,size:c,bandwidth:k,adjust:f,pad:C,curve:A,dir:N,d0:I,d1:a});return}const P=(N==="in"?-1:1)*(i==="bottom"||i==="right"?1:-1),R=(a-I)/o,y=new Array(o).fill(0);for(const w of n){const F=+w;if(w==null||Number.isNaN(F)||F<I||F>a)continue;let V=Math.floor((F-I)/R);V>=o&&(V=o-1),V<0&&(V=0),y[V]++}const q=Math.max(1,...y),Q=e.append("g").attr("class","za-scent").attr("transform",b?`translate(${h},${W})`:`translate(${W},${h})`);y.forEach((w,F)=>{if(!w)return;const V=I+F*R,Oe=I+(F+1)*R,Xe=M(V),Ge=M(Oe),Ke=Math.min(Xe,Ge),Ze=Math.max(1,Math.abs(Ge-Xe)-1),ne=w/q*c,Ee=Q.append("rect").style("fill",ue).attr("fill-opacity",.8);if(b){const Me=r==="violin"?-ne/2:P>0?0:-ne;Ee.attr("x",Ke).attr("width",Ze).attr("y",Me).attr("height",ne)}else{const Me=r==="violin"?-ne/2:P>0?0:-ne;Ee.attr("y",Ke).attr("height",Ze).attr("x",Me).attr("width",ne)}fe.push({r:Ee,x0:V,x1:Oe})}),ye()}function at(e,t,{type:n="violin",nBins:r,size:o,bandwidth:c,adjust:s,pad:u,curve:p,dir:d="in",d0:m,d1:k}){const f=[];for(const a of t){const P=+a;a!=null&&!Number.isNaN(P)&&f.push(P)}const C={bins:r};c!=null&&(C.bandwidth=c),s!=null&&(C.adjust=s),u!=null&&(C.pad=u);const $=Array.from(ft(f,C)).filter(a=>a.x>=m&&a.x<=k);if($.length<2)return;const A=Math.max(...$.map(a=>a.y))||1,N=n==="area"?ot($,A,o,p,d):nt($,A,o/2,p),j=e.append("g").attr("class","za-scent").attr("transform",b?`translate(${h},${W})`:`translate(${W},${h})`),I=`za-scent-clip-${++Et}`;le=j.append("clipPath").attr("id",I).append("rect").node(),j.append("path").attr("d",N).style("fill",ue).attr("fill-opacity",.85),j.append("path").attr("d",N).style("fill",ve).attr("fill-opacity",.9).attr("clip-path",`url(#${I})`),ye()}function nt(e,t,n,r){const o=u=>M(u.x),c=u=>u.y/t*n,s=r||(b?Le:Ce);return(b?xe().x(o).y0(u=>-c(u)).y1(u=>c(u)).curve(s):xe().y(o).x0(u=>-c(u)).x1(u=>c(u)).curve(s))(e)||""}function ot(e,t,n,r,o="in"){const c=(o==="in"?-1:1)*(i==="bottom"||i==="right"?1:-1),s=d=>M(d.x),u=d=>c*(d.y/t)*n,p=r||(b?Le:Ce);return(b?xe().x(s).y0(0).y1(u).curve(p):xe().y(s).x0(0).x1(u).curve(p))(e)||""}function ye(){const[e,t]=g;for(const n of fe)n.r.style("fill",n.x1>e&&n.x0<t?ve:ue);if(le){const n=M(e),r=M(t),o=Math.min(n,r),c=Math.abs(r-n),s=le;b?(s.setAttribute("x",o),s.setAttribute("width",c),s.setAttribute("y",-oe),s.setAttribute("height",oe*2)):(s.setAttribute("y",o),s.setAttribute("height",c),s.setAttribute("x",-oe),s.setAttribute("width",oe*2))}}function $e(e,t){let n=+J.value,r=+ee.value;n>r&&(e==="lo"?n=r:r=n),g=be([n,r],M.domain(),x),se(),t&&(G.call("input",D,g.slice()),me.setValue(g.slice()))}L.addEventListener("pointerdown",e=>{e.preventDefault();const t=b?e.clientX:e.clientY,n=g.slice(),r=n[1]-n[0],o=M.range(),c=(X-O)/(o[o.length-1]-o[0]);L.setPointerCapture(e.pointerId);const s=p=>{const d=(b?p.clientX:p.clientY)-t;let m=n[0]+d*c;m=Math.max(O,Math.min(X-r,m)),g=be([m,m+r],M.domain(),x),se(),G.call("input",D,g.slice()),me.setValue(g.slice())},u=()=>{L.releasePointerCapture(e.pointerId),L.removeEventListener("pointermove",s),L.removeEventListener("pointerup",u),G.call("end",D,g.slice())};L.addEventListener("pointermove",s),L.addEventListener("pointerup",u)});const we=e=>{const t={};for(const n of At)e[n]!=null&&(t[n]=e[n]);return typeof t.curve!="string"&&delete t.curve,t};function ke(e){S&&(S={...S,...e},Ye(Pe,S),ze&&Nt(ze,we(S)),G.call("scent",D,we(S)))}S&&H.controls!==!1&&it();function it(){const e=we(H),t=document.createElement("button");t.type="button",t.className="za-gear",t.textContent="\u2699",t.title="Density settings",t.setAttribute("aria-label","Density settings"),t.setAttribute("aria-expanded","false");const n=document.createElement("div");n.className="za-scent-panel",n.hidden=!0,n.setAttribute("role","dialog"),n.setAttribute("aria-label","Density settings");let r=!1;const o=a=>{if(!t.isConnected){document.removeEventListener("pointerdown",o);return}r&&!n.contains(a.target)&&a.target!==t&&c(!1)},c=a=>{r=a,n.hidden=!a,t.classList.toggle("on",a),t.setAttribute("aria-expanded",String(a)),a?document.addEventListener("pointerdown",o):document.removeEventListener("pointerdown",o)};t.addEventListener("click",a=>{a.stopPropagation(),c(!r)});const s=["histogram","area"],u=["area","violin"],p=[],d=(a,P,R)=>{const y=document.createElement("div");y.className="za-row";const q=document.createElement("label");q.textContent=a,y.appendChild(q),y.appendChild(P),n.appendChild(y),p.push({row:y,controlEl:P,applies:R})},m=(a,P,R)=>{const y=document.createElement("select");for(const[q,Q]of a){const w=document.createElement("option");w.value=q,w.textContent=Q,y.appendChild(w)}return y.addEventListener("change",()=>ke(R(y.value))),y._sync=()=>{y.value=P(S)},y},k=(a,P,R,y,q)=>{const Q=document.createElement("span");Q.className="za-range";const w=document.createElement("input");w.type="range",w.min=P,w.max=R,w.step=y;const F=document.createElement("span");return F.className="za-val",w.addEventListener("input",()=>{ke({[a]:+w.value}),F.textContent=q(+w.value)}),Q.appendChild(w),Q.appendChild(F),Q._sync=()=>{const V=S[a]!=null?S[a]:P;w.value=V,F.textContent=q(+V)},Q},f=m(Ct,a=>a.type||"area",a=>({type:a,style:a==="histogram"?"bars":"kde"}));d("Shape",f);const C=m(Lt,a=>typeof a.curve=="string"?a.curve:"basis",a=>({curve:a}));d("Curve",C,u),d("Smoothing",k("adjust",.2,3,.1,a=>"\xD7"+a.toFixed(1)),u),d("Pad",k("pad",0,.5,.02,a=>(+a).toFixed(2)),u);const $=m([["out","Away from plot"],["in","Toward plot"]],a=>a.direction??a.side??((a.type||"area")==="area"?"in":"out"),a=>({direction:a}));d("Direction",$,s),d("Bins",k("bins",10,120,1,a=>String(a))),d("Height",k("size",12,48,1,a=>a+"px"));const A=document.createElement("div");A.className="za-actions";const N=document.createElement("button");N.type="button",N.className="za-reset",N.textContent="Reset",N.addEventListener("click",()=>{ke(e),I()});const j=document.createElement("button");j.type="button",j.className="za-done",j.textContent="Done",j.addEventListener("click",()=>c(!1)),A.appendChild(N),A.appendChild(j),n.appendChild(A);function I(){const a=S.type||"area";for(const{row:P,controlEl:R,applies:y}of p)(R._sync||(()=>{}))(),P.style.display=!y||y.includes(a)?"":"none"}f.addEventListener("change",()=>I()),I(),K.node().appendChild(t),K.node().appendChild(n)}const me=zt(D,{value:g.slice(),showValue:()=>{g=be(me.value,M.domain(),x),se()}});return D.value_=()=>g.slice(),D.on=function(){const e=G.on.apply(G,arguments);return e===G?D:e},se(),me}export{Dt as zoomableAxisInput};

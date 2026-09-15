import type { Layer, ViewMode } from "@/lib/fab/types";

export const RENDER_W = 260;
export const RENDER_H = 170;

type Seg = [number, number]; // fractions of the full width

function complement(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  let cursor = 0;
  for (const [a, b] of [...segs].sort((x, y) => x[0] - y[0])) {
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < 1) out.push([cursor, 1]);
  return out;
}

export function segmentsFor(layer: Layer): Seg[] {
  if (!layer.patterned || !layer.pattern || layer.pattern.kind === "none") return [[0, 1]];
  const inverted = !!layer.pattern.inverted;
  if (layer.pattern.kind === "partialCover") {
    const c = Math.max(0, Math.min(1, layer.pattern.coverageFraction));
    const segs: Seg[] = c <= 0 ? [] : [[0, c]];
    return inverted ? complement(segs) : segs;
  }
  const n = Math.max(1, Math.min(12, Math.round(layer.pattern.count)));
  const ow = Math.max(0.05, Math.min(0.95, layer.pattern.openingWidth ?? 0.5));
  const hw = ow / n / 2; // half-width of each opening
  const segs: Seg[] = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const center = (i + 0.5) / n;
    const a = center - hw;
    const b = center + hw;
    if (a > cursor) segs.push([cursor, a]);
    cursor = b;
  }
  if (cursor < 1) segs.push([cursor, 1]);
  return inverted ? complement(segs) : segs;
}

const MIN_H = 5;

const totalThickness = (layers: Layer[]) =>
  layers.reduce((sum, l) => sum + Math.max(1, l.thickness), 0) || 1;

/**
 * Reference total thickness shared by every step so a given layer keeps the
 * same on-screen height across the whole flow. Uses the stack with the most
 * layers (ties broken by the thickest total).
 */
export function referenceTotal(stacks: Layer[][]): number {
  let best: Layer[] | undefined;
  for (const s of stacks) {
    if (
      !best ||
      s.length > best.length ||
      (s.length === best.length && totalThickness(s) > totalThickness(best))
    )
      best = s;
  }
  return best ? totalThickness(best) : 1;
}

function scaleThicknesses(layers: Layer[], available: number, refTotal?: number) {
  const total = refTotal && refTotal > 0 ? refTotal : totalThickness(layers);
  return layers.map((l) => Math.max(MIN_H, (Math.max(1, l.thickness) / total) * available));
}

/* ---------------------------------- 2D ---------------------------------- */

const NCOL = 240;

type LabelItem = { key: string; y: number; text: string };

/** Draws a stack growing upward from `baseY`. Mirroring is applied by the caller. */
function stackNodes(
  layers: Layer[],
  heights: number[],
  x0: number,
  w: number,
  baseY: number,
  withLabels: boolean,
) {
  const surface = new Array<number>(NCOL).fill(baseY);
  let flatTop = baseY;
  const nodes: React.ReactNode[] = [];
  const labelItems: LabelItem[] = [];

  layers.forEach((layer, i) => {
    const h = heights[i] ?? 6;
    const u = (layer.undercut ?? 0) * w * 0.012;
    const segs = segmentsFor(layer);
    const depth = Math.max(0, Math.min(1, layer.etchDepth ?? 1));
    const etchH = h * depth;
    const keepH = h - etchH;
    const flipped = !!layer.backsideEtch;
    const conformal = layer.conformal !== false;
    const planarize = conformal && !!layer.planarize;

    const isKept = (col: number) => {
      const f = (col + 0.5) / NCOL;
      return segs.some(([a, b]) => f >= a && f < b);
    };

    // base (y of the layer's underside) per column
    const bases = new Array<number>(NCOL);
    for (let c = 0; c < NCOL; c++) bases[c] = conformal ? surface[c]! : flatTop;

    // planarized layers have a single flat top: h above the highest point below
    const planarTop = Math.min(...bases) - h;

    // group contiguous columns sharing the same base and kept-state
    type Run = { start: number; end: number; base: number; kept: boolean };
    const runs: Run[] = [];
    for (let c = 0; c < NCOL; c++) {
      const kept = isKept(c);
      const base = bases[c]!;
      const last = runs[runs.length - 1];
      if (last && last.kept === kept && Math.abs(last.base - base) < 0.01) last.end = c + 1;
      else runs.push({ start: c, end: c + 1, base, kept });
    }

    let minTop = Infinity;
    let maxBottom = -Infinity;

    const push = (key: string, points: string) =>
      nodes.push(
        <polygon
          key={key}
          points={points}
          fill={layer.color}
          stroke={layer.color}
          strokeWidth={0.8}
          strokeLinejoin="round"
          opacity={layer.isResist ? 0.82 : 1}
        />,
      );

    const outline = (key: string, points: string) =>
      nodes.push(
        <polyline
          key={key}
          points={points}
          fill="none"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth={0.7}
          strokeLinejoin="round"
          strokeLinecap="round"
        />,
      );

    runs.forEach((run, ri) => {
      const left = x0 + (run.start / NCOL) * w;
      const right = x0 + (run.end / NCOL) * w;
      const top = planarize ? planarTop : run.base - h;
      const runH = run.base - top;
      const runEtchH = planarize ? runH * depth : etchH;
      const runKeepH = runH - runEtchH;
      const keepY = flipped ? top : top + runEtchH;

      const hasMaterial = (candidate: Run | undefined) => {
        if (!candidate) return false;
        const candidateTop = planarize ? planarTop : candidate.base - h;
        const candidateKeepH = (candidate.base - candidateTop) * (1 - depth);
        return candidate.kept || candidateKeepH > 0.01;
      };
      const prev = runs[ri - 1];
      const next = runs[ri + 1];
      const prevHasMaterial = hasMaterial(prev);
      const nextHasMaterial = hasMaterial(next);

      const isLeftEdge = run.start === 0;
      const isRightEdge = run.end === NCOL;
      // Slope belongs only to a sidewall exposed to a void or wafer edge.
      // Connected conformal runs meet at the exact boundary coordinate, so a
      // height-changing internal join remains vertical rather than tapering.
      const lNarrow = isLeftEdge || !prevHasMaterial ? left + (isLeftEdge ? 0 : u) : left;
      const rNarrow = isRightEdge || !nextHasMaterial ? right - (isRightEdge ? 0 : u) : right;

      if (run.kept) {
        // Draw the retained and etched portions as one shape. Separate shapes
        // produced a false horizontal seam at the partial-etch boundary.
        const points = flipped
          ? `${left},${top} ${right},${top} ${right},${top + runKeepH} ${rNarrow},${run.base} ${lNarrow},${run.base} ${left},${top + runKeepH}`
          : `${lNarrow},${top} ${rNarrow},${top} ${right},${top + runEtchH} ${right},${run.base} ${left},${run.base} ${left},${top + runEtchH}`;
        push(`${layer.id}-${ri}-solid`, points);
      } else if (runKeepH > 0.01) {
        push(
          `${layer.id}-${ri}-keep`,
          `${left},${keepY} ${right},${keepY} ${right},${run.base} ${left},${run.base}`,
        );
      }

      if (run.kept || runKeepH > 0.01) {
        // Top and bottom are true exterior boundaries. Side contours are only
        // drawn where the neighboring run has no material at that height, so
        // adjacent pieces of this same layer remain visually continuous.
        if (run.kept) {
          if (flipped) outline(`${layer.id}-${ri}-top`, `${left},${top} ${right},${top}`);
          else outline(`${layer.id}-${ri}-top`, `${lNarrow},${top} ${rNarrow},${top}`);
        } else {
          outline(`${layer.id}-${ri}-top`, `${left},${keepY} ${right},${keepY}`);
        }
        outline(`${layer.id}-${ri}-bottom`, `${left},${run.base} ${right},${run.base}`);

        const prevSharesBase = prev && Math.abs(prev.base - run.base) < 0.01;
        const nextSharesBase = next && Math.abs(next.base - run.base) < 0.01;
        const sideJoinY = flipped ? top + runKeepH : top + runEtchH;

        const visibleTopFor = (neighbor: Run) => {
          const neighborTop = planarize ? planarTop : neighbor.base - h;
          const neighborHeight = neighbor.base - neighborTop;
          const neighborEtchHeight = neighborHeight * depth;
          return neighbor.kept
            ? neighborTop
            : flipped
              ? neighborTop
              : neighborTop + neighborEtchHeight;
        };
        const visibleTop = run.kept ? top : keepY;

        // Adjacent runs are pieces of the same layer. A change in their base
        // height (for example where a conformal coating crosses a step) must
        // not produce a full-height internal seam. Only draw a side when the
        // neighboring run is an actual void, or at the outside of the wafer.
        if (!prevHasMaterial) {
          const points = !run.kept
            ? `${left},${keepY} ${left},${run.base}`
            : flipped
              ? `${left},${top} ${left},${sideJoinY} ${lNarrow},${run.base}`
              : `${lNarrow},${top} ${left},${sideJoinY} ${left},${run.base}`;
          outline(`${layer.id}-${ri}-left`, points);
        } else if (prevSharesBase && run.kept && !flipped && !prev.kept && runEtchH > 0.01) {
          outline(`${layer.id}-${ri}-left-etch`, `${lNarrow},${top} ${left},${sideJoinY}`);
        } else if (prevSharesBase && run.kept && flipped && !prev.kept && runEtchH > 0.01) {
          outline(`${layer.id}-${ri}-left-etch`, `${left},${sideJoinY} ${lNarrow},${run.base}`);
        }

        if (!nextHasMaterial) {
          const points = !run.kept
            ? `${right},${keepY} ${right},${run.base}`
            : flipped
              ? `${right},${top} ${right},${sideJoinY} ${rNarrow},${run.base}`
              : `${rNarrow},${top} ${right},${sideJoinY} ${right},${run.base}`;
          outline(`${layer.id}-${ri}-right`, points);
        } else if (nextSharesBase && run.kept && !flipped && !next.kept && runEtchH > 0.01) {
          outline(`${layer.id}-${ri}-right-etch`, `${rNarrow},${top} ${right},${sideJoinY}`);
        } else if (nextSharesBase && run.kept && flipped && !next.kept && runEtchH > 0.01) {
          outline(`${layer.id}-${ri}-right-etch`, `${right},${sideJoinY} ${rNarrow},${run.base}`);
        } else if (next) {
          const nextVisibleTop = visibleTopFor(next);
          if (Math.abs(nextVisibleTop - visibleTop) > 0.01) {
            outline(
              `${layer.id}-${ri}-right-step`,
              `${right},${Math.min(visibleTop, nextVisibleTop)} ${right},${Math.max(visibleTop, nextVisibleTop)}`,
            );
          }
        }
      }

      // new surface for the covered columns
      let newTop: number;
      if (run.kept) newTop = top;
      else if (runKeepH > 0.01) newTop = keepY;
      else newTop = run.base; // fully removed here — the void stays open
      for (let c = run.start; c < run.end; c++) surface[c] = newTop;

      if (run.kept || runKeepH > 0.01) {
        minTop = Math.min(minTop, run.kept ? top : keepY);
        maxBottom = Math.max(maxBottom, run.base);
      }
    });

    flatTop -= h;

    if (withLabels && minTop < Infinity) {
      labelItems.push({
        key: `${layer.id}-label`,
        y: (minTop + maxBottom) / 2,
        text: layer.material,
      });
    }
  });

  return { nodes, labelItems };
}

function CrossSection({
  layers,
  labels,
  refTotal,
}: {
  layers: Layer[];
  labels: boolean;
  refTotal?: number | undefined;
}) {
  const x0 = labels ? 18 : 30;
  const w = labels ? 168 : 200;
  const heights = scaleThicknesses(layers, RENDER_H - 55, refTotal);

  // layers placed before the substrate sit underneath it: they are drawn in a
  // vertically mirrored frame so "follows the surface" means the surface above.
  const subIdx = Math.max(0, layers.findIndex((l) => l.id === "substrate"));
  const belowLayers = layers.slice(0, subIdx).reverse();
  const belowHeights = heights.slice(0, subIdx).reverse();
  const aboveLayers = layers.slice(subIdx);
  const aboveHeights = heights.slice(subIdx);
  const belowTotal = belowHeights.reduce((s, h) => s + h, 0);

  const baseY = RENDER_H - 22 - belowTotal;

  const up = stackNodes(aboveLayers, aboveHeights, x0, w, baseY, labels);
  const down = stackNodes(belowLayers, belowHeights, x0, w, baseY, labels);

  const labelNodes = [
    ...up.labelItems.map((l) => ({ ...l, y: l.y })),
    ...down.labelItems.map((l) => ({ ...l, y: 2 * baseY - l.y })),
  ].map((l) => (
    <text key={l.key} x={x0 + w + 6} y={l.y + 3} fontSize={7} fill="currentColor" opacity={0.75}>
      {l.text}
    </text>
  ));

  return (
    <>
      <line
        x1={x0 - 6}
        y1={RENDER_H - 18}
        x2={x0 + w + 6}
        y2={RENDER_H - 18}
        stroke="currentColor"
        opacity={0.25}
        strokeWidth={0.8}
      />
      {up.nodes}
      <g transform={`translate(0, ${2 * baseY}) scale(1, -1)`}>{down.nodes}</g>
      {labelNodes}
    </>
  );
}



/* ---------------------------------- 3D ---------------------------------- */

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

function shade(hex: string, amount: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const ch = [m[1], m[2], m[3]].map((c) => {
    const v = Math.round(Math.max(0, Math.min(255, parseInt(c!, 16) * amount)));
    return v.toString(16).padStart(2, "0");
  });
  return `#${ch.join("")}`;
}

function Isometric({ layers, refTotal }: { layers: Layer[]; refTotal?: number | undefined }) {
  const SX = 46; // half depth in x
  const SY = 46;
  const cx = RENDER_W / 2;
  // keep the lowest isometric vertex (cy + (SX+SY)*SIN) inside the viewBox
  const cy = RENDER_H - 8 - (SX + SY) * SIN;
  const heights = scaleThicknesses(layers, RENDER_H - 120, refTotal);

  const p = (x: number, y: number, z: number) => {
    const px = cx + (x - y) * COS;
    const py = cy + (x + y) * SIN - z;
    return `${px.toFixed(2)},${py.toFixed(2)}`;
  };

  let z = 0;
  const nodes: React.ReactNode[] = [];

  layers.forEach((layer, i) => {
    const h = heights[i] ?? 6;
    const zTop = z + h;
    const A = [-SX, -SY];
    const B = [SX, -SY];
    const C = [SX, SY];
    const D = [-SX, SY];

    // left front face
    nodes.push(
      <polygon
        key={`${layer.id}-l`}
        points={`${p(D[0]!, D[1]!, z)} ${p(C[0]!, C[1]!, z)} ${p(C[0]!, C[1]!, zTop)} ${p(D[0]!, D[1]!, zTop)}`}
        fill={shade(layer.color, 0.68)}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.6}
      />,
    );
    // right front face
    nodes.push(
      <polygon
        key={`${layer.id}-r`}
        points={`${p(C[0]!, C[1]!, z)} ${p(B[0]!, B[1]!, z)} ${p(B[0]!, B[1]!, zTop)} ${p(C[0]!, C[1]!, zTop)}`}
        fill={shade(layer.color, 0.85)}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.6}
      />,
    );
    // top face
    const isTop = i === layers.length - 1;
    nodes.push(
      <polygon
        key={`${layer.id}-t`}
        points={`${p(A[0]!, A[1]!, zTop)} ${p(B[0]!, B[1]!, zTop)} ${p(C[0]!, C[1]!, zTop)} ${p(D[0]!, D[1]!, zTop)}`}
        fill={layer.color}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.6}
        opacity={layer.isResist ? 0.85 : 1}
      />,
    );

    // openings drawn on the top face of the topmost patterned layer
    if (isTop && layer.patterned && layer.pattern && layer.pattern.kind !== "none") {
      const inverted = !!layer.pattern.inverted;
      if (layer.pattern.kind === "holes") {
        const n = Math.max(1, Math.min(9, layer.pattern.count));
        const ow = Math.max(0.05, Math.min(0.95, layer.pattern.openingWidth ?? 0.5));
        const rows = layer.pattern.layout === "grid" ? Math.ceil(Math.sqrt(n)) : 1;
        const cols = Math.ceil(n / rows);
        if (inverted) {
          // exact negative: everything except the openings is removed
          nodes.push(
            <polygon
              key={`${layer.id}-inv`}
              points={`${p(A[0]!, A[1]!, zTop)} ${p(B[0]!, B[1]!, zTop)} ${p(C[0]!, C[1]!, zTop)} ${p(D[0]!, D[1]!, zTop)}`}
              fill={shade(layer.color, 0.45)}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.5}
            />,
          );
        }
        let drawn = 0;
        for (let r = 0; r < rows && drawn < n; r++) {
          for (let c = 0; c < cols && drawn < n; c++) {
            const ux = -SX + ((c + 0.5) / cols) * 2 * SX;
            const uy = -SY + ((r + 0.5) / rows) * 2 * SY;
            const px = cx + (ux - uy) * COS;
            const py = cy + (ux + uy) * SIN - zTop;
            nodes.push(
              <ellipse
                key={`${layer.id}-h-${r}-${c}`}
                cx={px}
                cy={py}
                rx={Math.min(14, ((2 * SX) / cols / 3) * (ow / 0.5))}
                ry={Math.min(14, ((2 * SX) / cols / 3) * (ow / 0.5)) * SIN * 1.15}
                fill={inverted ? layer.color : shade(layer.color, 0.45)}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={0.5}
              />,
            );
            drawn++;
          }
        }
      } else {
        const c = Math.max(0, Math.min(1, layer.pattern.coverageFraction));
        const xEdge = -SX + c * 2 * SX;
        const pts = inverted
          ? `${p(-SX, -SY, zTop)} ${p(xEdge, -SY, zTop)} ${p(xEdge, SY, zTop)} ${p(-SX, SY, zTop)}`
          : `${p(xEdge, -SY, zTop)} ${p(SX, -SY, zTop)} ${p(SX, SY, zTop)} ${p(xEdge, SY, zTop)}`;
        nodes.push(
          <polygon
            key={`${layer.id}-pc`}
            points={pts}
            fill={shade(layer.color, 0.5)}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={0.5}
          />,
        );
      }
    }

    z = zTop;
  });

  return <>{nodes}</>;
}

/* -------------------------------- wrapper -------------------------------- */

export function WaferRenderer({
  layers,
  mode,
  labels = false,
  refTotal,
  className,
  svgRef,
}: {
  layers: Layer[];
  mode: ViewMode;
  labels?: boolean;
  refTotal?: number | undefined;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${RENDER_W} ${RENDER_H}`}
      className={className}
      style={{ overflow: "hidden" }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Wafer stack rendering"
    >
      {mode === "cross" ? (
        <CrossSection layers={layers} labels={labels} refTotal={refTotal} />
      ) : (
        <Isometric layers={layers} refTotal={refTotal} />
      )}
    </svg>
  );
}

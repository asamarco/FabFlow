import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RENDER_H, RENDER_W, WaferRenderer, referenceTotal } from "@/components/fab/WaferRenderer";
import { stepIcon, stepLabel } from "./categories";
import type { ProcessFlow, ProcessStep, ViewMode } from "./types";

const FG = "#0f172a";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}

function stepInner(step: ProcessStep, mode: ViewMode, refTotal?: number) {
  return renderToStaticMarkup(
    createElement(WaferRenderer, { layers: step.stackAfter, mode, refTotal, labels: mode === "cross" }),
  )
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/currentColor/g, FG);
}

function stepIconMarkup(step: ProcessStep, x = 10, y = 6) {
  const Icon = stepIcon(step);
  return renderToStaticMarkup(
    createElement(Icon, {
      x,
      y,
      width: 14,
      height: 14,
      color: FG,
      strokeWidth: 2,
      "aria-hidden": "true",
    }),
  );
}

function wrapText(text: string, maxChars: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (lines.length < maxLines && line) lines.push(line.trim());
  return lines;
}

export function stepSvg(step: ProcessStep, index: number, mode: ViewMode, refTotal?: number) {
  const H = RENDER_H + 72;
  const lines = step.description?.trim() ? wrapText(step.description.trim(), 40, 3) : [];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER_W}" height="${H}" viewBox="0 0 ${RENDER_W} ${H}">
<rect width="100%" height="100%" fill="#ffffff"/>
${stepIconMarkup(step)}
<text x="30" y="18" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="700" fill="${FG}">${index + 1}. ${escapeXml(stepLabel(step))}</text>
<g transform="translate(0,24)">${stepInner(step, mode, refTotal)}</g>
${lines
  .map(
    (l, i) =>
      `<text x="${RENDER_W / 2}" y="${RENDER_H + 40 + i * 12}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="10" fill="${FG}">${escapeXml(l)}</text>`,
  )
  .join("\n")}
</svg>`;
}

export function storyboardSvg(flow: ProcessFlow, mode: ViewMode, perRow = 5) {
  const cardW = RENDER_W;
  const cardH = RENDER_H + 72;
  const gap = 14;
  const visible = flow.steps.filter((s) => !s.hidden);
  const cols = Math.min(perRow, Math.max(1, visible.length));
  const rows = Math.ceil(visible.length / cols) || 1;
  const W = cols * cardW + (cols + 1) * gap;
  const H = 52 + rows * (cardH + gap);

  const refTotal = referenceTotal([[flow.substrate], ...flow.steps.map((s) => s.stackAfter)]);

  const cards = visible
    .map((step, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = gap + c * (cardW + gap);
      const y = 46 + r * (cardH + gap);
      const lines = step.description?.trim() ? wrapText(step.description.trim(), 40, 3) : [];
      return `<g transform="translate(${x},${y})">
  <rect width="${cardW}" height="${cardH}" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  ${stepIconMarkup(step)}
  <text x="30" y="18" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="700" fill="${FG}">${i + 1}. ${escapeXml(stepLabel(step))}</text>
  <g transform="translate(0,22)">${stepInner(step, mode, refTotal)}</g>
  ${lines
    .map(
      (l, li) =>
        `<text x="${cardW / 2}" y="${RENDER_H + 38 + li * 12}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="10" fill="${FG}">${escapeXml(l)}</text>`,
    )
    .join("\n  ")}
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#f8fafc"/>
<text x="${gap}" y="30" font-family="ui-sans-serif,system-ui,sans-serif" font-size="20" font-weight="700" fill="${FG}">${escapeXml(flow.name)}</text>
${cards}
</svg>`;
}

export function download(filename: string, content: Blob | string, type = "image/svg+xml") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function svgToPngDataUrl(svg: string, scale = 2): Promise<string> {
  const widthMatch = /width="(\d+(?:\.\d+)?)"/.exec(svg);
  const heightMatch = /height="(\d+(?:\.\d+)?)"/.exec(svg);
  const w = Number(widthMatch?.[1] ?? 800);
  const h = Number(heightMatch?.[1] ?? 600);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterize SVG"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function downloadPng(filename: string, svg: string) {
  const dataUrl = await svgToPngDataUrl(svg);
  const res = await fetch(dataUrl);
  download(filename, await res.blob(), "image/png");
}

export async function exportPptx(flow: ProcessFlow, mode: ViewMode) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const refTotal = referenceTotal([[flow.substrate], ...flow.steps.map((s) => s.stackAfter)]);
  const visible = flow.steps.filter((s) => !s.hidden);
  const perSlide = 4;
  for (let i = 0; i < visible.length; i += perSlide) {
    const slide = pptx.addSlide();
    slide.addText(flow.name, { x: 0.3, y: 0.2, fontSize: 20, bold: true });
    const chunk = visible.slice(i, i + perSlide);
    for (let j = 0; j < chunk.length; j++) {
      const step = chunk[j]!;
      const svg = stepSvg(step, i + j, mode, refTotal);
      const data = await svgToPngDataUrl(svg, 3);
      slide.addImage({ data, x: 0.3 + j * 2.35, y: 1.0, w: 2.2, h: 2.2 * ((RENDER_H + 72) / RENDER_W) });
      if (step.description?.trim()) {
        slide.addText(`${i + j + 1}. ${step.description.trim()}`, {
          x: 0.3 + j * 2.35,
          y: 3.4,
          w: 2.2,
          h: 1.2,
          fontSize: 10,
          valign: "top",
        });
      }
    }
  }
  if (visible.length === 0) {
    const slide = pptx.addSlide();
    slide.addText(flow.name, { x: 0.5, y: 0.5, fontSize: 24, bold: true });
  }
  await pptx.writeFile({ fileName: `${flow.name.replace(/\s+/g, "_")}.pptx` });
}

// Geometria das fatias do círculo de participantes. Ângulos em graus,
// contados a partir do topo (meio-dia) no sentido horário.

function point(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const x = cx + radius * Math.sin(radians);
  const y = cy - radius * Math.cos(radians);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export interface SliceShape {
  cx: number;
  cy: number;
  inner: number;
  outer: number;
  start: number;
  end: number;
  // Arredondamento dos cantos (12 no Figma)
  corner: number;
}

/**
 * Caminho SVG de uma fatia de anel com os quatro cantos arredondados.
 * Cada canto é um arco de raio `corner` que encosta na borda reta e na curva.
 */
export function slicePath({
  cx,
  cy,
  inner,
  outer,
  start,
  end,
  corner,
}: SliceShape): string {
  const sweep = end - start;
  // O canto não pode passar da metade da espessura nem da largura da fatia
  const maxByThickness = (outer - inner) / 2;
  const maxByWidth = (inner * ((sweep * Math.PI) / 180)) / 2;
  const r = Math.max(0, Math.min(corner, maxByThickness, maxByWidth * 0.9));

  const outerOffset = toDegrees(Math.asin(r / (outer - r)));
  const innerOffset = toDegrees(Math.asin(r / (inner + r)));
  const outerEdge = Math.sqrt((outer - r) ** 2 - r ** 2);
  const innerEdge = Math.sqrt((inner + r) ** 2 - r ** 2);
  const outerLarge = sweep - 2 * outerOffset > 180 ? 1 : 0;
  const innerLarge = sweep - 2 * innerOffset > 180 ? 1 : 0;

  return [
    `M ${point(cx, cy, innerEdge, start)}`,
    `L ${point(cx, cy, outerEdge, start)}`,
    `A ${r} ${r} 0 0 1 ${point(cx, cy, outer, start + outerOffset)}`,
    `A ${outer} ${outer} 0 ${outerLarge} 1 ${point(cx, cy, outer, end - outerOffset)}`,
    `A ${r} ${r} 0 0 1 ${point(cx, cy, outerEdge, end)}`,
    `L ${point(cx, cy, innerEdge, end)}`,
    `A ${r} ${r} 0 0 1 ${point(cx, cy, inner, end - innerOffset)}`,
    `A ${inner} ${inner} 0 ${innerLarge} 0 ${point(cx, cy, inner, start + innerOffset)}`,
    `A ${r} ${r} 0 0 1 ${point(cx, cy, innerEdge, start)}`,
    "Z",
  ].join(" ");
}

/**
 * Anel fechado, para quando há uma pessoa só: uma fatia de 360° teria a folga
 * e os cantos arredondados e viraria um "C". O furo é o círculo de dentro
 * desenhado no sentido contrário (assim o preenchimento não entra nele).
 */
export function ringPath({
  cx,
  cy,
  inner,
  outer,
}: Pick<SliceShape, "cx" | "cy" | "inner" | "outer">): string {
  return [
    `M ${cx} ${cy - outer}`,
    `A ${outer} ${outer} 0 1 1 ${cx} ${cy + outer}`,
    `A ${outer} ${outer} 0 1 1 ${cx} ${cy - outer}`,
    "Z",
    `M ${cx} ${cy - inner}`,
    `A ${inner} ${inner} 0 1 0 ${cx} ${cy + inner}`,
    `A ${inner} ${inner} 0 1 0 ${cx} ${cy - inner}`,
    "Z",
  ].join(" ");
}

interface Point {
  x: number;
  y: number;
}

/** Ângulo do dedo em volta do centro, em graus: 0 no topo, crescendo no sentido horário */
export function angleAround(center: Point, finger: Point): number {
  const radians = Math.atan2(finger.x - center.x, center.y - finger.y);
  return (radians * 180) / Math.PI;
}

/**
 * Quanto o dedo girou entre dois ângulos, pelo caminho mais curto: de 170° a
 * -170° são +20°, não -340°. Positivo é sentido horário.
 */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % 360;
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return delta;
}

/** Ângulos de cada fatia, com uma folga entre elas (4° de cada lado com 4 pessoas) */
export function sliceAngles(index: number, count: number) {
  const step = 360 / count;
  const gap = Math.min(4, step * 0.15);
  return { start: index * step + gap, end: (index + 1) * step - gap };
}

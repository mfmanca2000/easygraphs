// Rendering helper functions

import type { LineStyle } from '@/app/types/canvas';

/**
 * Apply line style (solid, dashed, dotted) and opacity
 */
export function applyLineStyle(
  ctx: CanvasRenderingContext2D,
  style: LineStyle = 'solid',
  elementOpacity: number = 1
): void {
  // Apply opacity
  ctx.globalAlpha = elementOpacity;

  // Apply line dash pattern
  switch (style) {
    case 'dashed':
      ctx.setLineDash([10, 5]);  // 10px dash, 5px gap
      break;
    case 'dotted':
      ctx.setLineDash([2, 3]);   // 2px dot, 3px gap
      break;
    case 'solid':
    default:
      ctx.setLineDash([]);
      break;
  }
}

/**
 * Draw arrow at the end of a line
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  arrowSize: number,
  color: string,
  opacity: number
): void {
  // Calculate arrow direction angle
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;

  // Translate to arrow tip
  ctx.translate(toX, toY);
  ctx.rotate(angle);

  // Draw filled triangle
  ctx.beginPath();
  ctx.moveTo(0, 0);                          // Arrow tip
  ctx.lineTo(-arrowSize * 1.5, arrowSize);   // Bottom
  ctx.lineTo(-arrowSize * 1.5, -arrowSize);  // Top
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw arrow at the start of a line
 */
export function drawArrowAtStart(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  arrowSize: number,
  color: string,
  opacity: number
): void {
  // Calculate arrow direction angle (reversed)
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;

  // Translate to start point and rotate 180 degrees
  ctx.translate(fromX, fromY);
  ctx.rotate(angle + Math.PI);

  // Draw filled triangle
  ctx.beginPath();
  ctx.moveTo(0, 0);                          // Arrow tip
  ctx.lineTo(-arrowSize * 1.5, arrowSize);   // Bottom
  ctx.lineTo(-arrowSize * 1.5, -arrowSize);  // Top
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Wrap text to fit within a specified width
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

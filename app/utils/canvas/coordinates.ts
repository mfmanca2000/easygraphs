// Coordinate system transformation utilities

import type { Point } from '@/app/types/canvas';

/**
 * Convert canvas pixel coordinates to graph coordinates
 */
export function canvasToGraph(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: { x: number; y: number },
  panOffset: Point,
  titleOffset: number
): Point {
  const centerX = canvasWidth / 2 + panOffset.x;
  const centerY = (canvasHeight + titleOffset) / 2 + panOffset.y;

  return {
    x: (canvasX - centerX) / scale.x,
    y: (centerY - canvasY) / scale.y
  };
}

/**
 * Convert graph coordinates to canvas pixel coordinates
 */
export function graphToCanvas(
  graphX: number,
  graphY: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: { x: number; y: number },
  panOffset: Point,
  titleOffset: number
): Point {
  const centerX = canvasWidth / 2 + panOffset.x;
  const centerY = (canvasHeight + titleOffset) / 2 + panOffset.y;

  return {
    x: centerX + graphX * scale.x,
    y: centerY - graphY * scale.y
  };
}

/**
 * Calculate title offset (space reserved at top for title)
 */
export function calculateTitleOffset(
  titleText: string,
  titleYOffset: number,
  titleFontSize: number
): number {
  if (!titleText) return 0;
  return titleYOffset + titleFontSize + 20;
}

/**
 * Check if a click is near the axis (for panning trigger)
 */
export function isClickNearAxis(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  panOffset: Point,
  titleOffset: number,
  threshold: number = 20
): boolean {
  const centerX = canvasWidth / 2 + panOffset.x;
  const centerY = (canvasHeight + titleOffset) / 2 + panOffset.y;

  const nearVerticalAxis = Math.abs(canvasX - centerX) < threshold;
  const nearHorizontalAxis = Math.abs(canvasY - centerY) < threshold;

  return nearVerticalAxis || nearHorizontalAxis;
}

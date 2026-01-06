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
 * Calculate default pan offset to position bottom-left corner at specified graph coordinates
 * Default position: bottom-left corner at (-2.1, -2.1) for first quadrant focus
 */
export function calculateDefaultPanOffset(
  canvasWidth: number,
  canvasHeight: number,
  scale: { x: number; y: number },
  titleOffset: number,
  bottomLeftX: number = -0.9,
  bottomLeftY: number = -0.9
): Point {
  // For bottom-left corner of canvas:
  // canvasX = 0, canvasY = canvasHeight
  // We want: graphX = bottomLeftX, graphY = bottomLeftY

  // From canvasToGraph equations:
  // graphX = (canvasX - centerX) / scale.x
  // graphY = (centerY - canvasY) / scale.y

  // Substituting bottom-left corner values:
  // bottomLeftX = (0 - centerX) / scale.x  →  centerX = -bottomLeftX * scale.x
  // bottomLeftY = (centerY - canvasHeight) / scale.y  →  centerY = bottomLeftY * scale.y + canvasHeight

  // Since centerX = canvasWidth/2 + panOffset.x and centerY = (canvasHeight + titleOffset)/2 + panOffset.y:
  // panOffset.x = -bottomLeftX * scale.x - canvasWidth/2
  // panOffset.y = bottomLeftY * scale.y + canvasHeight - (canvasHeight + titleOffset)/2

  return {
    x: -bottomLeftX * scale.x - canvasWidth / 2,
    y: bottomLeftY * scale.y + canvasHeight / 2 - titleOffset / 2
  };
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

/**
 * Detect which axis was clicked (x or y)
 * Returns 'x' for x-axis, 'y' for y-axis, or null if neither
 */
export function detectClickedAxis(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  panOffset: Point,
  titleOffset: number,
  threshold: number = 20
): 'x' | 'y' | null {
  const centerX = canvasWidth / 2 + panOffset.x;
  const centerY = (canvasHeight + titleOffset) / 2 + panOffset.y;

  const nearVerticalAxis = Math.abs(canvasX - centerX) < threshold;
  const nearHorizontalAxis = Math.abs(canvasY - centerY) < threshold;

  // If near both, prioritize y-axis (vertical)
  if (nearVerticalAxis && centerY >= titleOffset && centerY <= canvasHeight) {
    return 'y';
  }

  if (nearHorizontalAxis && centerX >= 0 && centerX <= canvasWidth) {
    return 'x';
  }

  return null;
}

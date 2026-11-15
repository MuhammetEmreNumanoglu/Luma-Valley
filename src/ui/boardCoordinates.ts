/** Gesture coordinates are local to the measured board viewport, in React Native points. */
export function boardWorldPoint(x: number, y: number, cameraX: number, cameraY: number, zoom: number) {
  return { x: (x - cameraX) / zoom, y: (y - cameraY) / zoom };
}
export function boardCellAt(x: number, y: number, cell: number, pad: number, columns: number, rows: number) {
  const col = Math.floor((x - pad) / cell), row = Math.floor((y - pad) / cell);
  return col < 0 || row < 0 || col >= columns || row >= rows ? -1 : row * columns + col;
}

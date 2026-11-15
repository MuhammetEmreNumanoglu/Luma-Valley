import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { boardCellAt, boardWorldPoint } from '../src/ui/boardCoordinates';

test('every cell maps at its center and four inside corners under camera and zoom', () => {
  const cell = 43, pad = 2, cols = 7, rows = 9, cameraX = -285, cameraY = -113, zoom = 0.65;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    for (const [dx, dy] of [[0.01,0.01], [cell-0.01,0.01], [0.01,cell-0.01], [cell-0.01,cell-0.01], [cell/2,cell/2]]) {
      const wx = pad + col * cell + dx, wy = pad + row * cell + dy;
      const p = boardWorldPoint(wx * zoom + cameraX, wy * zoom + cameraY, cameraX, cameraY, zoom);
      assert.equal(boardCellAt(p.x, p.y, cell, pad, cols, rows), row * cols + col);
    }
  }
  assert.equal(boardCellAt(pad - 0.1, pad, cell, pad, cols, rows), -1);
  assert.equal(boardCellAt(pad + cols * cell, pad, cell, pad, cols, rows), -1);
});

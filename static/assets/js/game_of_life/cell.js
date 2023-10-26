export class Cell {
  alive = false;
  aliveNeighbours = 0;

  constructor(rowId, colId) {
    this.rowId = rowId;
    this.colId = colId;
  }
}

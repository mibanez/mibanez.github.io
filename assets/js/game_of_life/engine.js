import { Cell } from "./cell.js";
import { Renderer } from "./renderer.js";

export class Engine {
  running = false;

  constructor(height, width) {
    this.height = height;
    this.width = width;
    this.renderer = new Renderer(height, width, (rowId, colId) => this.manualToggleCell(rowId, colId));
    this.cells = this.initilizeBoard();
  }

  manualToggleCell(rowId, colId) {
    const cell = this.cells[rowId][colId];

    cell.alive = !cell.alive;
    this.renderer.refresh(rowId, colId, cell.alive);
  }

  start() {
    this.running = true;
    this.run();
  }

  stop() {
    this.running = false;
  }

  run() {
    if (this.running) {
      this.tick();
      setTimeout(() => this.run(), 1000);
    }
  }

  tick() {
    this.forEachCell(cell => this.recalculateAliveNeighbours(cell));
    this.forEachCell(cell => this.evolve(cell));
  }

  forEachCell(func) {
    this.cells.forEach(boardRow => {
      boardRow.forEach(cell => func(cell));
    });
  }

  recalculateAliveNeighbours(cell) {
    cell.aliveNeighbours = 0;

    [-1, 0, 1].forEach(i => {
      const neighbourRow = (this.height + cell.rowId + i) % this.height;

      [-1, 0, 1].forEach(j => {
        const neighbourCol = (this.width + cell.colId + j) % this.width;
        const neighbour = this.cells[neighbourRow][neighbourCol];

        if (neighbour != cell && neighbour.alive) {
          cell.aliveNeighbours += 1;
        }
      });
    });
  }

  evolve(cell) {
    if (cell.alive) {
      if (cell.aliveNeighbours < 2 || cell.aliveNeighbours > 3) {
        cell.alive = false;
        this.renderer.refresh(cell.rowId, cell.colId, cell.alive);
      }
    } else if (cell.aliveNeighbours == 3) {
      cell.alive = true;
      this.renderer.refresh(cell.rowId, cell.colId, cell.alive);
    }
  }

  initilizeBoard() {
    return Array(this.height).fill().map((_, rowId) => {
      return Array(this.width).fill().map((_, colId) => {
        return new Cell(rowId, colId);
      });
    });
  }
}

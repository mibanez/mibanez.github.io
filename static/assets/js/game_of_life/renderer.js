export class Renderer {
  static TABLE_ID = "game-of-life-board";

  constructor(height, width, manualClickAction) {
    this.height = height;
    this.width = width;
    this.manualClickAction = manualClickAction;
    this.cells = this.initilizeCells();
  }

  refresh(rowId, colId, isAlive) {
    if (isAlive) {
      this.cells[rowId][colId].className = "active"
    } else {
      this.cells[rowId][colId].className = "";
    }
  }

  initilizeCells() {
    const table = document.getElementById(Renderer.TABLE_ID);

    return Array(this.height).fill().map((_, rowId)=> {
      const row = document.createElement("tr");
      table.appendChild(row);

      return Array(this.width).fill().map((_, colId) => {
        const col = document.createElement("td");
        row.appendChild(col);
        col.onclick = () => this.manualClickAction(rowId, colId);

        return col;
      });
    });
  }
}

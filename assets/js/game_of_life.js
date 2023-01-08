function runGame() {
  const cells = createBoard(25, 25);

  setUpButton(cells);
}

function createBoard(height, width) {
  const tableElement = document.getElementById("game-of-life-board");

  return Array(height).fill().map(_ => {
    const rowElement = document.createElement("tr");
    tableElement.appendChild(rowElement);

    return Array(width).fill().map(_ => {
      const colElement = document.createElement("td");
      rowElement.appendChild(colElement);
      colElement.onclick = () => {
        if (colElement.className) {
          colElement.className = ""
        } else {
          colElement.className = "active"
        }
      };

      return colElement;
    });
  });
}

function setUpButton(cells) {
  const buttonElement = document.getElementById("game-of-life-button");
  buttonElement.onclick = () => {
    if (buttonElement.className) {
      buttonElement.className = "";
      buttonElement.innerHTML = "Start";
    } else {
      buttonElement.className = "active";
      buttonElement.innerHTML = "Stop";
      runRenderer(cells);
    }
  };
}

function runRenderer(cells) {
  if (!gameIsRunning()) {
    return;
  }

  for (let i = 0; i < cells.length; i++) {
    for (let j = 0; j < cells[i].length; j++) {
      const live_neighbours = [-1, 0, 1].reduce((total, m) => {
        return total + [-1, 0, 1].reduce((rowTotal, n) => {
          if (m == 0 && n == 0) {
            return rowTotal;
          } else if (i + m < 0 || i + m >= cells.length) {
            return rowTotal;
          } else if (j + n < 0 || j + n >= cells[i].length) {
            return rowTotal;
          } else if (!cells[i + m][j + n].className) {
            return rowTotal;
          }

          return rowTotal + 1;
        }, 0);
      }, 0);

      if (cells[i][j].className) {
        if (live_neighbours < 2 || live_neighbours > 3) {
          cells[i][j].className = "";
        }
      } else if (live_neighbours == 3) {
        cells[i][j].className = "active";
      }
    }
  }

  setTimeout(() => runRenderer(cells), 1000);
}

function gameIsRunning() {
  return !!document.getElementById("game-of-life-button").className;
}

window.addEventListener('DOMContentLoaded', (event) => {
  runGame();
});

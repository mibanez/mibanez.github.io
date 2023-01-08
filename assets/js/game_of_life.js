import { Engine } from "./game_of_life/engine.js";

function createStartStopButton(engine) {
  const buttonElement = document.getElementById("game-of-life-button");
  buttonElement.onclick = () => {
    if (buttonElement.className) {
      buttonElement.className = "";
      buttonElement.innerHTML = "Start";
      engine.stop();
    } else {
      buttonElement.className = "active";
      buttonElement.innerHTML = "Stop";
      engine.start();
    }
  };
}

window.addEventListener("DOMContentLoaded", (event) => {
  const engine = new Engine(25, 25);

  createStartStopButton(engine);
});

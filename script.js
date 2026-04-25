const canvas = document.getElementById("whiteboard");
const ctk = canvas.getContext("2d");
const colorPicker = document.getElementById("colorpicker");
const brushSize = document.getElementById("BrushSize");
const clearBtn = document.getElementById("clearButton");
const penBtn = document.getElementById("penButton");
const eraserBtn = document.getElementById("eraserButton");
const eraserSize = document.getElementById("EraserSize");
const downloadBtn = document.getElementById("downloadButton");
const printBtn = document.getElementById("printButton");
const undoBtn = document.getElementById("undoButton");
const redoBtn = document.getElementById("redoButton");
const textBtn = document.getElementById("textButton");
const eraserCursor = document.getElementById("eraserCursor");
const zoomInBtn = document.getElementById("zoomIn");
const zoomResetBtn = document.getElementById("zoomReset");
const zoomOutBtn = document.getElementById("zoomOut");
const panBtn = document.getElementById("hand");
const isMobile = window.innerWidth <= 768;
const WORKING_SPACE = isMobile ? 1 : 3;
const MAX_HISTORY = isMobile ? 5 : 20;

let currentZoom = 1;
canvas.style.transformOrigin = "top left";
canvas.style.transition = "transform 0.1s ease-out";

colorPicker.style.display = "none";
brushSize.style.display = "none";
eraserSize.style.display = "none";

canvas.width = window.innerWidth * WORKING_SPACE;
canvas.height = window.innerHeight * WORKING_SPACE;

let isDrawing = false;
let isErasing = false;
let isTextMode = false;
let lastX = 0;
let lastY = 0;
let currentLineWidth = 5;
let isHoveringCanvas = false;
let isPanMode = false;
let isPanning = false;
let cameraX = isMobile ? 0 : -window.innerWidth;
let cameraY = isMobile ? 0 : -window.innerHeight;
let panStartX = 0;
let panStartY = 0;

ctk.lineJoin = "round";
ctk.lineCap = "round";

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / currentZoom,
    y: (e.clientY - rect.top) / currentZoom,
  };
}

function updateZoom() {
  canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${currentZoom})`;
  zoomResetBtn.innerText = Math.round(currentZoom * 100) + "%";
  localStorage.setItem(
    "camera_state",
    JSON.stringify({ x: cameraX, y: cameraY, zoom: currentZoom }),
  );
}
zoomInBtn.addEventListener("click", () => {
  currentZoom = Math.min(currentZoom + 0.25, 4);
  updateZoom();
});

zoomOutBtn.addEventListener("click", () => {
  currentZoom = Math.max(currentZoom - 0.25, 0.5);
  updateZoom();
});
zoomResetBtn.addEventListener("click", () => {
  currentZoom = 1;
  updateZoom();
});

function resizeCanvas() {
  const goodLook = window.devicePixelRatio || 1;
  const csswidth = window.innerWidth * WORKING_SPACE;
  const cssheight = window.innerHeight * WORKING_SPACE;

  canvas.style.width = csswidth + "px";
  canvas.style.height = cssheight + "px";

  canvas.width = csswidth * goodLook;
  canvas.height = cssheight * goodLook;
  ctk.scale(goodLook, goodLook);

  ctk.lineJoin = "round";
  ctk.lineCap = "round";
  updateZoom();
}

penBtn.addEventListener("click", () => {
  isErasing = false;
  isTextMode = false;
  isPanMode = false;

  colorPicker.style.display = "block";
  brushSize.style.display = "block";
  eraserSize.style.display = "none";
  canvas.style.cursor = "crosshair";
  updateEraserSize();
});

eraserBtn.addEventListener("click", () => {
  isErasing = true;
  isTextMode = false;
  isPanMode = false;

  colorPicker.style.display = "none";
  brushSize.style.display = "none";
  eraserSize.style.display = "block";
  canvas.style.cursor = "crosshair";
  updateEraserSize();
});

textBtn.addEventListener("click", () => {
  isTextMode = true;
  isErasing = false;
  isPanMode = false;

  colorPicker.style.display = "block";
  brushSize.style.display = "block";
  eraserSize.style.display = "none";
  canvas.style.cursor = "crosshair";

  updateEraserSize();
});

panBtn.addEventListener("click", () => {
  isPanMode = true;
  isErasing = false;
  isTextMode = false;
  colorPicker.style.display = "none";
  brushSize.style.display = "none";
  eraserSize.style.display = "none";
  canvas.style.cursor = "grab";
  updateEraserSize();
});

function getDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function draw(e) {
  if (!isDrawing) {
    return;
  }
  let baseSize;
  if (isErasing) {
    ctk.globalCompositeOperation = "destination-out";
    baseSize = parseFloat(eraserSize.value);
  } else {
    ctk.globalCompositeOperation = "source-over";
    ctk.strokeStyle = colorPicker.value;
    baseSize = parseFloat(brushSize.value);
  }

  const pos = getMousePos(e);

  const distance = getDistance(lastX, lastY, pos.x, pos.y);
  const velocity = 10;
  const velocityStroke = Math.max(0.4, 1 - distance / velocity);

  let pressure = 1;
  if (e.pointerType === "pen" && e.pressure > 0) {
    pressure = e.pressure;
  }
  const targetWidth = baseSize * pressure * velocityStroke;
  currentLineWidth = currentLineWidth + (targetWidth - currentLineWidth) * 0.2;

  ctk.lineWidth = currentLineWidth;
  ctk.beginPath();
  ctk.moveTo(lastX, lastY);
  ctk.lineTo(pos.x, pos.y);
  ctk.stroke();
  [lastX, lastY] = [pos.x, pos.y];
}

canvas.addEventListener("pointerdown", (e) => {
  colorPicker.style.display = "none";
  brushSize.style.display = "none";
  eraserSize.style.display = "none";

  if (isPanMode) {
    isPanning = true;
    panStartX = e.clientX - cameraX;
    panStartY = e.clientY - cameraY;
    canvas.style.cursor = "grabbing";
    return;
  }

  const pos = getMousePos(e);

  if (isTextMode) {
    spawnTextBox(e.clientX, e.clientY, pos.x, pos.y);
    return;
  }
  isDrawing = true;
  [lastX, lastY] = [pos.x, pos.y];
  if (isErasing) {
    currentLineWidth = parseFloat(eraserSize.value);
  } else {
    currentLineWidth = parseFloat(brushSize.value);
  }
  draw(e);
});

function stopDrawing() {
  if (isPanMode) {
    isPanning = false;
    canvas.style.cursor = "grab";
    return;
  }
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
}

canvas.addEventListener("pointerenter", () => {
  isHoveringCanvas = true;
});

canvas.addEventListener("pointermove", (e) => {
  if (isPanMode && isPanning) {
    cameraX = e.clientX - panStartX;
    cameraY = e.clientY - panStartY;
    updateZoom();
    return;
  }
  updateEraserSize(e);
  draw(e);
});

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", () => {
  isHoveringCanvas = false;
  eraserCursor.style.display = "none";
  stopDrawing();
});
eraserSize.addEventListener("input", () => {
  updateEraserSize();
});

clearBtn.addEventListener("click", () => {
  ctk.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
});

window.addEventListener("resize", () => {
  const imageData = ctk.getImageData(0, 0, canvas.width, canvas.height);
  resizeCanvas();

  ctk.putImageData(imageData, 0, 0);
});

downloadBtn.addEventListener("click", () => {
  const tempCanvas = document.createElement("canvas");
  const tempCtk = tempCanvas.getContext("2d");

  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtk.fillStyle = "#ffffff";
  tempCtk.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtk.drawImage(canvas, 0, 0);

  const link = document.createElement("a");
  link.download = "my-whiteboard.png";
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
});

printBtn.addEventListener("click", () => {
  window.print();
});

const downloadIcon = document.createElement("i");
downloadIcon.className = "fas fa-download";
downloadBtn.prepend(downloadIcon);

const penIcon = document.createElement("i");
penIcon.className = "fas fa-pen";
penBtn.prepend(penIcon);

const printIcon = document.createElement("i");
printIcon.className = "fas fa-print";
printBtn.prepend(printIcon);

const eraserIcon = document.createElement("i");
eraserIcon.className = "fas fa-eraser";
eraserBtn.prepend(eraserIcon);

const clearIcon = document.createElement("i");
clearIcon.className = "fas fa-broom";
clearBtn.prepend(clearIcon);

const textIcon = document.createElement("i");
textIcon.className = "fas fa-font";
textBtn.prepend(textIcon);

const zoomInIcon = document.createElement("i");
zoomInIcon.className = "fas fa-search-plus";
zoomInBtn.prepend(zoomInIcon);

const zoomOutIcon = document.createElement("i");
zoomOutIcon.className = "fas fa-search-minus";
zoomOutBtn.prepend(zoomOutIcon);

const panIcon = document.createElement("i");
panIcon.className = "fas fa-hand-paper";
panBtn.prepend(panIcon);

let undoStack = [];
let redoStack = [];

function saveState() {
  undoStack.push(ctk.getImageData(0, 0, canvas.width, canvas.height));
  redoStack = [];
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }

  const dataURL = canvas.toDataURL();
  try {
    localStorage.setItem("board_state", dataURL);
  } catch (error) {
    console.warn("storage is full");
  }
}

function undo() {
  if (undoStack.length > 1) {
    redoStack.push(undoStack.pop());
    const previousImage = undoStack[undoStack.length - 1];
    ctk.putImageData(previousImage, 0, 0);
  }
}

function redo() {
  if (redoStack.length > 0) {
    const nextState = redoStack.pop();
    undoStack.push(nextState);
    ctk.putImageData(nextState, 0, 0);
  }
}

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

const undoIcon = document.createElement("i");
undoIcon.className = "fas fa-undo";
undoBtn.prepend(undoIcon);

const redoIcon = document.createElement("i");
redoIcon.className = "fas fa-redo";
redoBtn.prepend(redoIcon);

Mousetrap.bind("mod+z", (e) => {
  e.preventDefault();
  undo();
});

Mousetrap.bind(["mod+shift+z", "mod+y"], (e) => {
  e.preventDefault();
  redo();
});

Mousetrap.bind("p", () => {
  penBtn.click();
});

Mousetrap.bind("e", () => {
  eraserBtn.click();
});
Mousetrap.bind("t", () => {
  textBtn.click();
});

Mousetrap.bind("c", () => {
  ctk.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
});

Mousetrap.bind("h", () => {
  panBtn.click();
});

function initializeBoard() {
  resizeCanvas();

  try {
    const savedCamera = localStorage.getItem("camera_state");
    if (savedCamera) {
      const cam = JSON.parse(savedCamera);
      cameraX = cam.x;
      cameraY = cam.y;
      currentZoom = cam.zoom;
      updateZoom();
    }
  } catch (error) {
    console.warn("failed to load camera state");
  }

  const savedBoard = localStorage.getItem("board_state");
  if (savedBoard) {
    const img = new Image();

    img.onload = () => {
      ctk.clearRect(0, 0, canvas.width, canvas.height);
      const goodLook = window.devicePixelRatio || 1;
      const csswidth = canvas.width / goodLook;
      const cssheight = canvas.height / goodLook;
      ctk.drawImage(img, 0, 0, csswidth, cssheight);

      undoStack = [ctk.getImageData(0, 0, canvas.width, canvas.height)];
    };
    img.src = savedBoard;
  } else {
    undoStack = [ctk.getImageData(0, 0, canvas.width, canvas.height)];
  }
}

window.addEventListener("load", () => {
  setTimeout(initializeBoard, 50);
});

function spawnTextBox(clientX, clientY, canvasX, canvasY) {
  const textarea = document.createElement("textarea");
  textarea.className = "text-tool-input";

  const fontSize = parseFloat(brushSize.value) * 3;

  textarea.style.left = clientX + "px";
  textarea.style.top = clientY + "px";
  textarea.style.color = colorPicker.value;
  textarea.style.fontSize = fontSize + "px";
  textarea.style.lineHeight = "1.2";

  textarea.style.width = "300px";
  textarea.style.height = fontSize * 3 + "px";

  document.body.appendChild(textarea);
  setTimeout(() => textarea.focus(), 0);

  textarea.addEventListener("blur", () => {
    const text = textarea.value;

    if (text.trim() !== "") {
      ctk.textBaseline = "top";
      ctk.font = `${fontSize}px "Manrope", sans-serif`;

      ctk.fillStyle = colorPicker.value;

      const lines = text.split("\n");
      lines.forEach((line, index) => {
        ctk.fillText(line, canvasX, canvasY + index * fontSize * 1.2);
      });
      saveState();
    }

    textarea.remove();
  });
}

function updateEraserSize(e) {
  if (!isErasing || !isHoveringCanvas) {
    eraserCursor.style.display = "none";
    return;
  }
  eraserCursor.style.display = "block";
  if (e) {
    eraserCursor.style.left = e.clientX + "px";
    eraserCursor.style.top = e.clientY + "px";
  }

  const size = parseFloat(eraserSize.value);
  eraserCursor.style.width = size + "px";
  eraserCursor.style.height = size + "px";
}

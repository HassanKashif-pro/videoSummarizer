// Ensure the script runs only once
if (!document.getElementById("my-floating-ui")) {
  setupWatermarkListener();
}

// Function to set up the watermark click listener
function setupWatermarkListener() {
  const watermark = document.getElementById("your-watermark-id");

  if (!watermark) {
    console.warn("Watermark not found! Make sure it's correctly injected.");
    return;
  }

  watermark.addEventListener("click", () => {
    let floatingUI = document.getElementById("my-floating-ui");

    if (!floatingUI) {
      injectFloatingUI();
    } else {
      // Toggle visibility instead of reinjecting
      floatingUI.style.display =
        floatingUI.style.display === "none" ? "block" : "none";
    }
  });
}

// Function to inject the floating UI
function injectFloatingUI() {
  if (document.getElementById("my-floating-ui")) return; // Prevent duplicates

  const container = document.createElement("div");
  container.id = "my-floating-ui";
  container.innerHTML = `
      <div id="floating-header">Drag Me ✥ <button id="close-ui">✖</button></div>
      <div id="floating-content">
          <p>Your floating UI content here!</p>
      </div>
  `;

  // Apply basic styling
  Object.assign(container.style, {
    position: "fixed",
    top: "100px",
    left: "100px",
    width: "300px",
    background: "white",
    border: "1px solid black",
    borderRadius: "8px",
    boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.2)",
    zIndex: "9999",
    fontFamily: "Arial, sans-serif",
  });

  document.body.appendChild(container);
  makeDraggable(container);

  // Close button functionality
  const closeBtn = document.getElementById("close-ui") as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      container.style.display = "none";
    });
  }
}

// Function to make the UI draggable
function makeDraggable(el: HTMLElement) {
  const header = document.createElement("div");
  header.id = "floating-header";
  header.style.cssText = `
      background: #007bff;
      color: white;
      padding: 8px;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
  `;
  el.prepend(header);

  let offsetX = 0,
    offsetY = 0,
    isDragging = false;

  header.onmousedown = (e: MouseEvent) => {
    isDragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
  };

  document.onmousemove = (e: MouseEvent) => {
    if (isDragging) {
      el.style.left = `${e.clientX - offsetX}px`;
      el.style.top = `${e.clientY - offsetY}px`;
    }
  };

  document.onmouseup = () => {
    isDragging = false;
  };
}

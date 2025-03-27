console.log("Injected into YouTube!");

const checkInterval = setInterval(() => {
  const videoPlayer = document.querySelector(".html5-video-player");
  if (videoPlayer && !document.getElementById("summify-watermark")) {
    clearInterval(checkInterval);
    // Create watermark container
    const watermark = document.createElement("div");
    watermark.id = "summify-watermark";
    // Create logo image
    const logoImage = document.createElement("img");
    logoImage.src = chrome.runtime.getURL("icons/image.png"); // Corrected to runtime for Manifest V3
    logoImage.alt = "Summify Logo";
    // Create text span
    const textSpan = document.createElement("span");
    textSpan.textContent = " Open Summify →";
    // Append elements
    watermark.appendChild(logoImage);
    watermark.appendChild(textSpan);
    // Click event to open floating UI (modified below)
    watermark.addEventListener("click", () => {
      console.log("Watermark clicked!");
      createFloatingUI();
    });
    // Append watermark to YouTube player
    videoPlayer.appendChild(watermark);
    console.log("Watermark added!");
  }
}, 1000);

function createFloatingUI() {
  // Remove existing UI if present
  const existingUI = document.getElementById("floating_ui");
  if (existingUI) existingUI.remove();

  // Create the floating UI container
  const floatingDiv = document.createElement("div");
  floatingDiv.id = "floating_ui";
  floatingDiv.className = "floating_ui";

  // Header bar
  const headerBar = document.createElement("div");
  headerBar.className = "header_bar";

  // Logo
  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("images/logo.png");
  logo.alt = "Logo";
  logo.className = "logo";
  headerBar.appendChild(logo);

  // Close icon
  const menuIcons = document.createElement("div");
  menuIcons.className = "menu_icons";
  menuIcons.innerHTML = `<span class="icon close">×</span>`;
  headerBar.appendChild(menuIcons);

  // Append header to floating div
  floatingDiv.appendChild(headerBar);

  // Main content area
  const contentArea = document.createElement("div");
  contentArea.className = "content_area";

  // Left column with magic icon
  const leftColumn = document.createElement("div");
  leftColumn.className = "left_column";
  leftColumn.innerHTML = `<div class="icon magic">🪄</div>`;
  contentArea.appendChild(leftColumn);

  // Text input container with camera and pin icons
  const textInputContainer = document.createElement("div");
  textInputContainer.className = "text_input_container";

  // Icons next to text input
  const textInputIcons = document.createElement("div");
  textInputIcons.className = "text_input_icons";
  textInputIcons.innerHTML = `
    <div class="icon camera">📷</div>
    <div class="icon pin">📌</div>
  `;
  textInputContainer.appendChild(textInputIcons);

  // Text input field
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "Add a note";
  textInput.className = "text_input";
  textInputContainer.appendChild(textInput);

  // Append text input container to content area
  contentArea.appendChild(textInputContainer);

  // Append content area to floating div
  floatingDiv.appendChild(contentArea);

  // Make it draggable
  makeDraggable(floatingDiv);

  // Append to body
  document.body.appendChild(floatingDiv);

  // Close functionality
  menuIcons.querySelector(".close")?.addEventListener("click", () => {
    floatingDiv.remove();
  });
}

function makeDraggable(element: HTMLDivElement) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  element.onmousedown = function (e: MouseEvent) {
    // Explicitly define type
    e.preventDefault();

    pos3 = e.clientX;
    pos4 = e.clientY;

    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  };

  function elementDrag(e: MouseEvent) {
    // Ensure this is a MouseEvent
    e.preventDefault();

    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    // Ensure it doesn't go outside viewport
    const newTop = element.offsetTop - pos2;
    const newLeft = element.offsetLeft - pos1;

    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

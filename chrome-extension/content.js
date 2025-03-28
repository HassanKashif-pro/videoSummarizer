"use strict";
// content.ts
console.log("Injected into YouTube!");
// Add Material Icons CDN
const link = document.createElement("link");
link.href =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
link.rel = "stylesheet";
document.head.appendChild(link);
const checkInterval = setInterval(() => {
    const videoPlayer = document.querySelector(".html5-video-player");
    if (videoPlayer && !document.getElementById("summify-watermark")) {
        clearInterval(checkInterval);
        const watermark = document.createElement("div");
        watermark.id = "summify-watermark";
        const logoImage = document.createElement("img");
        logoImage.src = chrome.runtime.getURL("icons/image.png");
        logoImage.alt = "Summify Logo";
        const textSpan = document.createElement("span");
        textSpan.textContent = " Open Summify →";
        watermark.appendChild(logoImage);
        watermark.appendChild(textSpan);
        watermark.addEventListener("click", () => {
            console.log("Watermark clicked!");
            createFloatingUI();
        });
        videoPlayer.appendChild(watermark);
        console.log("Watermark added!");
    }
}, 1000);
function createFloatingUI() {
    // Remove existing UI if present
    const existingUI = document.getElementById("floating_ui");
    if (existingUI)
        existingUI.remove();
    // Create the floating UI container
    const floatingDiv = document.createElement("div");
    floatingDiv.id = "floating_ui";
    floatingDiv.className = "floating_ui";
    // Set initial position (e.g., top-right corner)
    floatingDiv.style.top = "20px"; // 20px from the top
    floatingDiv.style.right = "20px"; // 20px from the right
    floatingDiv.style.left = "auto"; // Ensure left is not set
    floatingDiv.style.bottom = "auto"; // Ensure bottom is not set
    floatingDiv.style.height = "35px"; // Ensure bottom is not set
    // Header bar
    const headerBar = document.createElement("div");
    headerBar.className = "header_bar";
    // Create a clickable container for the logo
    const logoButton = document.createElement("div");
    logoButton.id = "ui-logo"; // Use a different ID to avoid conflict with summify-watermark
    logoButton.className = "interactive_logo";
    // Logo inside the button
    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("icons/image.png");
    logo.alt = "Logo";
    logo.className = "logo";
    // Text span for the transitioning effect
    const logoText = document.createElement("span");
    logoText.textContent = "To Notes >";
    logoText.className = "logo-text";
    // Append logo and text to the button
    logoButton.appendChild(logo);
    logoButton.appendChild(logoText);
    // Append to headerBar
    headerBar.appendChild(logoButton);
    // Three-dots (more options) button
    const menuOptions = document.createElement("div");
    menuOptions.className = "menu_options";
    menuOptions.innerHTML = `<span class="material-symbols-outlined icon more" style="border: none">more_vert</span>`;
    headerBar.appendChild(menuOptions);
    // Close icon on the right side of the header
    const menuIconsRight = document.createElement("div");
    menuIconsRight.className = "menu_icons_right";
    menuIconsRight.innerHTML = `<span class="material-symbols-outlined icon close">close</span>`;
    headerBar.appendChild(menuIconsRight);
    // ✅ Add Click Event (e.g., Open/Close Floating UI)
    logoButton.addEventListener("click", () => {
        console.log("UI Logo clicked!");
        // Add logic to show/hide your floating UI or other actions
    });
    // Append header to floating div
    floatingDiv.appendChild(headerBar);
    // Main content area
    const mainBody = document.createElement("div");
    mainBody.className = "main_body";
    // Append main body to floating div
    floatingDiv.appendChild(mainBody);
    // Footer
    const footer = document.createElement("div");
    footer.className = "footer";
    // Form container with camera, pin, and text input in a row
    const formContainer = document.createElement("div");
    formContainer.className = "form_container";
    // Camera icon
    const cameraIcon = document.createElement("span");
    cameraIcon.className = "material-symbols-outlined icon camera";
    cameraIcon.textContent = "photo_camera";
    formContainer.appendChild(cameraIcon);
    // Pin icon
    const pinIcon = document.createElement("span");
    pinIcon.className = "material-symbols-outlined icon pin";
    pinIcon.textContent = "push_pin";
    formContainer.appendChild(pinIcon);
    // Text input field
    // Create a wrapper div for the input and icon
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "input-wrapper"; // For styling
    // Create the icon (using a span with Material Symbols as an example)
    const inputIcon = document.createElement("span");
    inputIcon.className = "material-symbols-outlined input-icon";
    inputIcon.textContent = "note"; // Example icon name, adjust as needed
    // Create the text input
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Add a note";
    textInput.className = "text_input";
    // Append icon and input to the wrapper
    inputWrapper.appendChild(inputIcon);
    inputWrapper.appendChild(textInput);
    // Append the wrapper to the form container
    formContainer.appendChild(inputWrapper);
    // Append form container to footer
    footer.appendChild(formContainer);
    // Append footer to floating div
    floatingDiv.appendChild(footer);
    // Make it draggable
    makeDraggable(floatingDiv);
    // Append to body
    document.body.appendChild(floatingDiv);
    // Close functionality
    menuIconsRight.querySelector(".close")?.addEventListener("click", () => {
        floatingDiv.remove();
    });
}
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = function (e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };
    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
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

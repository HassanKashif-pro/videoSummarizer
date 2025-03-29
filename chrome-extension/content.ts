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
  if (existingUI) existingUI.remove();

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

  // Create a clickable link container
  const logoLink = document.createElement("a");
  logoLink.href = "https://localhost:5000"; // Set the website URL
  logoLink.target = "_blank"; // Open in a new tab
  logoLink.rel = "noopener noreferrer"; // Security best practice

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

  // Append logoButton inside the anchor link
  logoLink.appendChild(logoButton);

  // ✅ Append the link (which contains the button) to the header
  headerBar.appendChild(logoLink);

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

  // Main content area// Create the main body
  const mainBody = document.createElement("div");
  mainBody.className = "main_body";

  // Create a top row container
  const topRow = document.createElement("div");
  topRow.className = "top_row";

  // Create the book icon
  const magicIcon = document.createElement("span");
  magicIcon.className = "material-symbols-outlined icon book_4_spark";
  magicIcon.textContent = "book_4_spark";

  // Append the icon to the top row
  topRow.appendChild(magicIcon);

  // Append the top row to the main body
  mainBody.appendChild(topRow);

  // Append main body to floating div
  floatingDiv.appendChild(mainBody);

  /// Footer
  const footer: HTMLDivElement = document.createElement("div");
  footer.className = "footer";

  // Make the footer clickable to focus the text editor
  footer.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("icon") ||
      target.tagName === "BUTTON" ||
      target.closest(".formatting_toolbar")
    ) {
      return;
    }
    textEditor.focus();
  });

  // Form container with camera, pin, and text input in a row
  const formContainer: HTMLDivElement = document.createElement("div");
  formContainer.className = "form_container";

  // Camera icon
  const cameraIcon: HTMLSpanElement = document.createElement("span");
  cameraIcon.className = "material-symbols-outlined icon camera";
  cameraIcon.textContent = "photo_camera";
  cameraIcon.addEventListener("click", () => {
    const fileInput: HTMLInputElement = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
          const imageUrl = event.target?.result as string;
          document.execCommand("insertImage", false, imageUrl);
          textEditor.focus();
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  });
  formContainer.appendChild(cameraIcon);

  // Pin icon
  const pinIcon: HTMLSpanElement = document.createElement("span");
  pinIcon.className = "material-symbols-outlined icon pin";
  pinIcon.textContent = "push_pin";
  pinIcon.addEventListener("click", () => {
    const url: string | null = prompt("Enter a URL to insert:");
    if (url) {
      document.execCommand("createLink", false, url);
      textEditor.focus();
    }
  });
  formContainer.appendChild(pinIcon);

  // Text input field
  const inputWrapper: HTMLDivElement = document.createElement("div");
  inputWrapper.className = "input-wrapper";

  // Create the icon (using a span with Material Symbols as an example)
  const inputIcon: HTMLSpanElement = document.createElement("span");
  inputIcon.className = "material-symbols-outlined input-icon";
  inputIcon.textContent = "note";

  // Create the contenteditable div for text input
  const textEditor: HTMLDivElement = document.createElement("div");
  textEditor.className = "text_editor";
  textEditor.contentEditable = "true";
  textEditor.textContent = "Add a note";
  textEditor.style.color = "#999";

  // Create the formatting toolbar
  const formattingToolbar: HTMLDivElement = document.createElement("div");
  formattingToolbar.className = "formatting_toolbar";
  formattingToolbar.style.display = "none";

  // Formatting buttons
  const boldButton: HTMLButtonElement = document.createElement("button");
  boldButton.innerHTML = "<b>B</b>";
  boldButton.addEventListener("click", () => {
    document.execCommand("bold", false, undefined);
    textEditor.focus();
    toggleHighlight(boldButton);
  });

  const italicButton: HTMLButtonElement = document.createElement("button");
  italicButton.innerHTML = "<i>I</i>";
  italicButton.addEventListener("click", () => {
    document.execCommand("italic", false, undefined);
    textEditor.focus();
    toggleHighlight(italicButton);
  });

  const underlineButton: HTMLButtonElement = document.createElement("button");
  underlineButton.innerHTML = "<u>U</u>";
  underlineButton.addEventListener("click", () => {
    document.execCommand("underline", false, undefined);
    textEditor.focus();
    toggleHighlight(underlineButton);
  });

  const bulletListButton: HTMLButtonElement = document.createElement("button");
  bulletListButton.innerHTML =
    '<span class="material-symbols-outlined">format_list_bulleted</span>';
  bulletListButton.addEventListener("click", () => {
    document.execCommand("insertUnorderedList", false, undefined);
    textEditor.focus();
    toggleHighlight(bulletListButton);
  });

  const numberedListButton: HTMLButtonElement =
    document.createElement("button");
  numberedListButton.innerHTML =
    '<span class="material-symbols-outlined">format_list_numbered</span>';
  numberedListButton.addEventListener("click", () => {
    document.execCommand("insertOrderedList", false, undefined);
    textEditor.focus();
    toggleHighlight(numberedListButton);
  });

  // Append buttons to the toolbar
  formattingToolbar.appendChild(boldButton);
  formattingToolbar.appendChild(italicButton);
  formattingToolbar.appendChild(underlineButton);
  formattingToolbar.appendChild(bulletListButton);
  formattingToolbar.appendChild(numberedListButton);

  // Clear placeholder text on focus and hide icons
  textEditor.addEventListener("focus", () => {
    if (textEditor.textContent === "Add a note") {
      textEditor.textContent = "";
      textEditor.style.color = "#000";
    }
    formattingToolbar.style.display = "flex";
    cameraIcon.style.display = "none";
    pinIcon.style.display = "none";
    inputWrapper.style.width = "100%";

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement?.blur();
    }

    //Unfocus the youtube player if it is focused.
    const youtubePlayer = document.querySelector("iframe"); //Replace with your youtube player selector if needed.
    if (youtubePlayer && youtubePlayer === document.activeElement) {
      youtubePlayer.blur();
    }

    textEditor.focus();
  });

  textEditor.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });

  textEditor.addEventListener("keypress", (event) => {
    event.stopPropagation();
  });

  textEditor.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      textEditor.blur(); // Close the text input
    }
  });

  // Restore placeholder text if empty on blur and show icons
  textEditor.addEventListener("blur", () => {
    if (textEditor.textContent?.trim() === "") {
      textEditor.textContent = "Add a note";
      textEditor.style.color = "#999";
    }
    // Hide the formatting toolbar
    formattingToolbar.style.display = "none";
    // Show the camera and pin icons
    cameraIcon.style.display = "inline-flex";
    pinIcon.style.display = "inline-flex";
    // Reset input-wrapper width
    inputWrapper.style.width = "";
    //remove all highlights when blur
    document
      .querySelectorAll(".formatting_toolbar button.highlighted")
      .forEach((el) => el.classList.remove("highlighted"));
  });

  // Append toolbar, icon, and editor to the wrapper
  inputWrapper.appendChild(formattingToolbar);
  inputWrapper.appendChild(inputIcon);
  inputWrapper.appendChild(textEditor);

  // Append the wrapper to the form container
  formContainer.appendChild(inputWrapper);

  // Append form container to footer
  footer.appendChild(formContainer);

  // Append footer to floating div
  floatingDiv.appendChild(footer);

  function toggleHighlight(element: HTMLButtonElement) {
    element.classList.toggle("highlighted");
  }

  // Make it draggable
  makeDraggable(floatingDiv);

  // Append to body
  document.body.appendChild(floatingDiv);

  // Close functionality
  menuIconsRight.querySelector(".close")?.addEventListener("click", () => {
    floatingDiv.remove();
  });
}

function makeDraggable(element: HTMLDivElement) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  element.onmousedown = function (e: MouseEvent) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  };

  function elementDrag(e: MouseEvent) {
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

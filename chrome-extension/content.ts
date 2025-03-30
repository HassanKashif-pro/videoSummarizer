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

  const floatingDiv = document.createElement("div");
  floatingDiv.id = "floating_ui";
  floatingDiv.className = "floating_ui";
  floatingDiv.style.top = "20px";
  floatingDiv.style.right = "20px";
  floatingDiv.style.left = "auto";
  floatingDiv.style.bottom = "auto";
  floatingDiv.style.height = "auto";

  const headerBar = document.createElement("div");
  headerBar.className = "header_bar";

  const logoLink = document.createElement("a");
  logoLink.href = "https://localhost:5000";
  logoLink.target = "_blank";
  logoLink.rel = "noopener noreferrer";

  const logoButton = document.createElement("div");
  logoButton.id = "ui-logo";
  logoButton.className = "interactive_logo";

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/image.png");
  logo.alt = "Logo";
  logo.className = "logo";

  const logoText = document.createElement("span");
  logoText.textContent = "To Notes >";
  logoText.className = "logo-text";

  logoButton.appendChild(logo);
  logoButton.appendChild(logoText);
  logoLink.appendChild(logoButton);
  headerBar.appendChild(logoLink);

  const menuOptions = document.createElement("div");
  menuOptions.className = "menu_options";
  menuOptions.innerHTML = `<span class="material-symbols-outlined icon more" style="border: none">more_vert</span>`;
  headerBar.appendChild(menuOptions);

  const menuIconsRight = document.createElement("div");
  menuIconsRight.className = "menu_icons_right";
  menuIconsRight.innerHTML = `<span class="material-symbols-outlined icon close">close</span>`;
  headerBar.appendChild(menuIconsRight);

  floatingDiv.appendChild(headerBar);

  const mainBody = document.createElement("div");
  mainBody.className = "main_body";

  const topRow = document.createElement("div");
  topRow.className = "top_row";

  const magicIcon = document.createElement("span");
  magicIcon.className = "material-symbols-outlined icon book_4_spark";
  magicIcon.textContent = "book_4_spark";

  topRow.appendChild(magicIcon);
  mainBody.appendChild(topRow);
  floatingDiv.appendChild(mainBody);

  function addToMainBody(
    contentType: string,
    content: string | ArrayBuffer | null | undefined
  ) {
    const contentDiv = document.createElement("div");
    contentDiv.className = "content-item";

    const contentArea = document.createElement("div");
    contentArea.className = "content-area";

    switch (contentType) {
      case "text":
        contentArea.innerHTML = content?.toString() ?? "";
        contentArea.contentEditable = "false";
        contentArea.addEventListener("click", () => {
          if (contentArea.contentEditable === "false") {
            contentArea.contentEditable = "true";
            contentArea.focus();
            contentArea.addEventListener("keydown", stopPropagation);
            contentArea.addEventListener("keypress", stopPropagation);
          }
        });
        contentArea.addEventListener("blur", () => {
          contentArea.contentEditable = "false";
          contentArea.removeEventListener("keydown", stopPropagation);
          contentArea.removeEventListener("keypress", stopPropagation);
        });
        contentArea.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            contentArea.blur();
          }
        });
        break;
      case "image":
        if (content) {
          const img = document.createElement("img");
          img.src = typeof content === "string" ? content : "";
          img.style.maxWidth = "100%";
          contentArea.appendChild(img);
        }
        break;
      case "link":
        const link = document.createElement("a");
        link.href = content?.toString() ?? "";
        link.textContent = content?.toString() ?? "";
        link.target = "_blank";
        contentArea.appendChild(link);
        break;
    }

    contentDiv.appendChild(contentArea);

    const deleteButton = document.createElement("span");
    deleteButton.className = "delete-button material-symbols-outlined";
    deleteButton.textContent = "delete";
    deleteButton.addEventListener("click", () => {
      contentDiv.remove();
    });
    contentDiv.appendChild(deleteButton);

    // Insert contentDiv after topRow
    if (mainBody.firstChild) {
      if (mainBody.firstChild.nextSibling) {
        mainBody.insertBefore(contentDiv, mainBody.firstChild.nextSibling);
      } else {
        mainBody.appendChild(contentDiv);
      }
    } else {
      mainBody.appendChild(contentDiv);
    }
  }

  function stopPropagation(event: { stopPropagation: () => void }) {
    event.stopPropagation();
  }

  const footer = document.createElement("div");
  footer.className = "footer";

  footer.addEventListener("click", (e) => {
    const target = e.target;
    if (
      target instanceof Element &&
      (target.classList.contains("icon") ||
        target.tagName === "BUTTON" ||
        target.closest(".formatting_toolbar"))
    ) {
      return;
    }
    textEditor.focus();
  });

  const formContainer = document.createElement("div");
  formContainer.className = "form_container";

  // Screenshot icon
  const screenshotIcon = document.createElement("span");
  screenshotIcon.className = "material-symbols-outlined icon camera";
  screenshotIcon.textContent = "photo_camera";
  screenshotIcon.title = "Capture YouTube frame";
  screenshotIcon.addEventListener("click", async () => {
    try {
      const dataUrl = await captureYouTubeFrame();
      if (dataUrl) {
        addToMainBody("image", dataUrl);
        textEditor.focus();
      }
    } catch (err: unknown) {
      console.error("Screenshot error:", err);
      alert(
        "Error capturing YouTube frame: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  });
  formContainer.appendChild(screenshotIcon);

  // Pin icon
  const pinIcon = document.createElement("span");
  pinIcon.className = "material-symbols-outlined icon pin";
  pinIcon.textContent = "push_pin";
  pinIcon.addEventListener("click", () => {
    const url = prompt("Enter a URL to insert:");
    if (url) {
      addToMainBody("link", url);
      textEditor.focus();
    }
  });
  formContainer.appendChild(pinIcon);

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "input-wrapper";

  const inputIcon = document.createElement("span");
  inputIcon.className = "material-symbols-outlined input-icon";
  inputIcon.textContent = "note";

  const textEditor = document.createElement("div");
  textEditor.className = "text_editor";
  textEditor.contentEditable = "true";
  textEditor.textContent = "Add a note";
  textEditor.style.color = "#999";

  const formattingToolbar = document.createElement("div");
  formattingToolbar.className = "formatting_toolbar";
  formattingToolbar.style.display = "none";

  const boldButton = document.createElement("button");
  boldButton.innerHTML = "<b>B</b>";
  boldButton.addEventListener("click", () => {
    document.execCommand("bold", false, undefined);
    textEditor.focus();
    toggleHighlight(boldButton);
  });

  const italicButton = document.createElement("button");
  italicButton.innerHTML = "<i>I</i>";
  italicButton.addEventListener("click", () => {
    document.execCommand("italic", false, undefined);
    textEditor.focus();
    toggleHighlight(italicButton);
  });

  const underlineButton = document.createElement("button");
  underlineButton.innerHTML = "<u>U</u>";
  underlineButton.addEventListener("click", () => {
    document.execCommand("underline", false, undefined);
    textEditor.focus();
    toggleHighlight(underlineButton);
  });

  const bulletListButton = document.createElement("button");
  bulletListButton.innerHTML =
    '<span class="material-symbols-outlined">format_list_bulleted</span>';
  bulletListButton.addEventListener("click", () => {
    document.execCommand("insertUnorderedList", false, undefined);
    textEditor.focus();
    toggleHighlight(bulletListButton);
  });

  const numberedListButton = document.createElement("button");
  numberedListButton.innerHTML =
    '<span class="material-symbols-outlined">format_list_numbered</span>';
  numberedListButton.addEventListener("click", () => {
    document.execCommand("insertOrderedList", false, undefined);
    textEditor.focus();
    toggleHighlight(numberedListButton);
  });

  formattingToolbar.appendChild(boldButton);
  formattingToolbar.appendChild(italicButton);
  formattingToolbar.appendChild(underlineButton);
  formattingToolbar.appendChild(bulletListButton);
  formattingToolbar.appendChild(numberedListButton);

  textEditor.addEventListener("focus", () => {
    if (textEditor.textContent === "Add a note") {
      textEditor.textContent = "";
      textEditor.style.color = "#000";
    }
    formattingToolbar.style.display = "flex";
    screenshotIcon.style.display = "none";
    pinIcon.style.display = "none";
    inputWrapper.style.width = "100%";
    if (document.activeElement !== textEditor) {
      (document.activeElement as HTMLElement)?.blur();
    }
  });

  textEditor.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (textEditor.textContent?.trim() !== "") {
        addToMainBody("text", textEditor.innerHTML);
        textEditor.textContent = "";
        textEditor.style.color = "#999";
      }
    }
    if (e.key === "Escape") {
      textEditor.blur();
    }
  });

  textEditor.addEventListener("keypress", (e) => {
    e.stopPropagation();
  });

  textEditor.addEventListener("blur", () => {
    if (textEditor.textContent?.trim() === "") {
      textEditor.textContent = "Add a note";
      textEditor.style.color = "#999";
    }
    formattingToolbar.style.display = "none";
    screenshotIcon.style.display = "inline-flex";
    pinIcon.style.display = "inline-flex";
    inputWrapper.style.width = "";
    document
      .querySelectorAll(".formatting_toolbar button.highlighted")
      .forEach((el) => el.classList.remove("highlighted"));
  });

  inputWrapper.appendChild(formattingToolbar);
  inputWrapper.appendChild(inputIcon);
  inputWrapper.appendChild(textEditor);
  formContainer.appendChild(inputWrapper);
  footer.appendChild(formContainer);
  floatingDiv.appendChild(footer);

  function toggleHighlight(element: HTMLButtonElement) {
    element.classList.toggle("highlighted");
  }

  // YouTube frame capture function
  async function captureYouTubeFrame() {
    const youtubeVideo = document.querySelector("video"); // Standard YouTube player
    if (!youtubeVideo) {
      throw new Error("No YouTube video found on page");
    }

    const canvas = document.createElement("canvas");
    canvas.width = youtubeVideo.videoWidth;
    canvas.height = youtubeVideo.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    ctx.drawImage(youtubeVideo, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }

  makeDraggable(floatingDiv);
  document.body.appendChild(floatingDiv);

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
function stopPropagation(this: HTMLDivElement, ev: KeyboardEvent) {
  throw new Error("Function not implemented.");
}

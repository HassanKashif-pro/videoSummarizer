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
    // Set initial position
    floatingDiv.style.top = "20px";
    floatingDiv.style.right = "20px";
    floatingDiv.style.left = "auto";
    floatingDiv.style.bottom = "auto";
    floatingDiv.style.height = "auto"; // Changed from fixed height to auto
    // Header bar
    const headerBar = document.createElement("div");
    headerBar.className = "header_bar";
    // Create a clickable link container
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
    // Menu options
    const menuOptions = document.createElement("div");
    menuOptions.className = "menu_options";
    menuOptions.innerHTML = `<span class="material-symbols-outlined icon more" style="border: none">more_vert</span>`;
    headerBar.appendChild(menuOptions);
    // Close icon
    const menuIconsRight = document.createElement("div");
    menuIconsRight.className = "menu_icons_right";
    menuIconsRight.innerHTML = `<span class="material-symbols-outlined icon close">close</span>`;
    headerBar.appendChild(menuIconsRight);
    floatingDiv.appendChild(headerBar);
    // Main content area
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
    // Function to add content to main body
    function addToMainBody(contentType, content) {
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
                        // Add event listeners to prevent background effects
                        contentArea.addEventListener("keydown", stopPropagation);
                        contentArea.addEventListener("keypress", stopPropagation);
                    }
                });
                contentArea.addEventListener("blur", () => {
                    contentArea.contentEditable = "false";
                    // Remove event listeners when editing is done
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
        // Delete button
        const deleteButton = document.createElement("span");
        deleteButton.className = "delete-button material-symbols-outlined";
        deleteButton.textContent = "delete";
        deleteButton.addEventListener("click", () => {
            contentDiv.remove();
        });
        contentDiv.appendChild(deleteButton);
        if (mainBody.firstChild) {
            mainBody.insertBefore(contentDiv, mainBody.firstChild.nextSibling);
        }
        else {
            mainBody.appendChild(contentDiv);
        }
    }
    function stopPropagation(event) {
        event.stopPropagation();
    }
    // Footer
    const footer = document.createElement("div");
    footer.className = "footer";
    footer.addEventListener("click", (e) => {
        const target = e.target;
        if (target?.classList.contains("icon") ||
            target?.tagName === "BUTTON" ||
            target?.closest(".formatting_toolbar")) {
            return;
        }
        textEditor.focus();
    });
    const formContainer = document.createElement("div");
    formContainer.className = "form_container";
    // Camera icon
    const cameraIcon = document.createElement("span");
    cameraIcon.className = "material-symbols-outlined icon camera";
    cameraIcon.textContent = "photo_camera";
    cameraIcon.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = (e) => {
            const input = e.target;
            const file = input.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageUrl = event.target.result;
                    addToMainBody("image", imageUrl);
                    textEditor.focus();
                };
                reader.readAsDataURL(file);
            }
        };
        fileInput.click();
    });
    formContainer.appendChild(cameraIcon);
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
    // Text input field
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
    // Formatting buttons
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
    // Text editor event listeners
    textEditor.addEventListener("focus", () => {
        if (textEditor.textContent === "Add a note") {
            textEditor.textContent = "";
            textEditor.style.color = "#000";
        }
        formattingToolbar.style.display = "flex";
        cameraIcon.style.display = "none";
        pinIcon.style.display = "none";
        inputWrapper.style.width = "100%";
        // Prevent background focus
        if (document.activeElement instanceof HTMLElement &&
            document.activeElement !== textEditor) {
            document.activeElement.blur();
        }
    });
    // Stop key events from propagating to background
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
        cameraIcon.style.display = "inline-flex";
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
    function toggleHighlight(element) {
        element.classList.toggle("highlighted");
    }
    // Make it draggable (assuming makeDraggable is defined elsewhere)
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
function stopPropagation(ev) {
    throw new Error("Function not implemented.");
}

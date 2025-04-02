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
    const existingUI = document.getElementById("floating_ui");
    if (existingUI)
        existingUI.remove();
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
    function addToMainBody(contentType, content, timestamp, pin = false) {
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
                    const addTextButton = document.createElement("button");
                    addTextButton.className = "add-text-icon material-symbols-outlined";
                    addTextButton.textContent = "text_fields";
                    Object.assign(addTextButton.style, {
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "rgba(255, 255, 255, 0.85)",
                        border: "none",
                        borderRadius: "10%",
                        padding: "8px",
                        cursor: "pointer",
                        opacity: "0",
                        transform: "scale(0.9)",
                        transition: "all 0.2s ease-in-out",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        color: "#000000",
                        fontSize: "20px",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    });
                    contentArea.addEventListener("click", (e) => {
                        console.log("contentArea clicked");
                        let textInput = contentArea.querySelector(".image-text-input");
                        if (!textInput) {
                            addTextToImage(contentArea);
                        }
                    });
                    addTextButton.addEventListener("mouseover", () => {
                        Object.assign(addTextButton.style, {
                            background: "rgba(255, 255, 255, 0.95)",
                            transform: "scale(1.1)",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                        });
                    });
                    addTextButton.addEventListener("mouseout", () => {
                        Object.assign(addTextButton.style, {
                            background: "rgba(255, 255, 255, 0.85)",
                            transform: "scale(1)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        });
                    });
                    contentArea.appendChild(addTextButton);
                    contentArea.addEventListener("mouseover", () => {
                        addTextButton.style.display = "flex";
                        setTimeout(() => {
                            addTextButton.style.opacity = "1";
                            addTextButton.style.transform = "scale(1)";
                        }, 0);
                    });
                    contentArea.addEventListener("mouseout", () => {
                        addTextButton.style.opacity = "0";
                        addTextButton.style.transform = "scale(0.9)";
                        setTimeout(() => {
                            if (addTextButton.style.opacity === "0") {
                                addTextButton.style.display = "none";
                            }
                        }, 200);
                    });
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
        const timestampContainer = document.createElement("div");
        timestampContainer.className = "timestamp-container";
        if (timestamp) {
            const timestampButton = document.createElement("button");
            timestampButton.className = "timestamp clickable-timestamp";
            const playIcon = document.createElement("span");
            playIcon.className = "material-symbols-outlined";
            playIcon.textContent = "play_arrow";
            const timestampText = document.createElement("span");
            timestampText.textContent = timestamp;
            timestampButton.appendChild(playIcon);
            timestampButton.appendChild(timestampText);
            timestampButton.addEventListener("click", () => {
                const video = document.querySelector("video");
                if (video) {
                    const timeInSeconds = parseTimestamp(timestamp);
                    video.currentTime = timeInSeconds;
                }
            });
            timestampContainer.appendChild(timestampButton);
        }
        const deleteButton = document.createElement("span");
        deleteButton.className = "delete-button material-symbols-outlined";
        deleteButton.textContent = "delete";
        deleteButton.addEventListener("click", () => {
            contentDiv.remove();
        });
        timestampContainer.appendChild(deleteButton);
        contentDiv.appendChild(timestampContainer);
        if (pin) {
            contentDiv.classList.add("pinned");
        }
        const mainBody = document.querySelector(".main_body");
        if (!mainBody)
            return;
        if (mainBody.firstChild && mainBody.firstChild.nextSibling) {
            if (pin) {
                mainBody.insertBefore(contentDiv, mainBody.firstChild);
            }
            else {
                mainBody.insertBefore(contentDiv, mainBody.firstChild.nextSibling);
            }
        }
        else {
            mainBody.appendChild(contentDiv);
        }
    }
    function pinTimestamp(videoElement) {
        const mainBody = document.querySelector(".main_body");
        if (!mainBody)
            return;
        const currentTime = formatTime(videoElement.currentTime);
        const pinnedTimestampDiv = document.createElement("div");
        pinnedTimestampDiv.className = "pinned-timestamp";
        // Create a play icon (if you have one)
        const playIcon = document.createElement("span");
        playIcon.className = "material-symbols-outlined"; // Or your icon class
        playIcon.textContent = "play_arrow"; // Or your icon text
        // Create a span for the timestamp text
        const timestampText = document.createElement("span");
        timestampText.textContent = `Pinned Time: ${currentTime}`;
        // Append the icon and text to the pinnedTimestampDiv
        pinnedTimestampDiv.appendChild(playIcon);
        pinnedTimestampDiv.appendChild(timestampText);
        // Add event listener to jump to timestamp when clicked
        pinnedTimestampDiv.addEventListener("click", () => {
            const timeInSeconds = parseTimestamp(currentTime); // Parse the timestamp
            if (videoElement) {
                videoElement.currentTime = timeInSeconds;
            }
        });
        // Remove any existing pinned timestamp
        const existingPinnedTimestamp = document.querySelector(".pinned-timestamp");
        if (existingPinnedTimestamp) {
            existingPinnedTimestamp.remove();
        }
        // Insert the new pinned timestamp at the top
        mainBody.insertBefore(pinnedTimestampDiv, mainBody.firstChild);
    }
    function stopPropagation(event) {
        event.stopPropagation();
    }
    function addTextToImage(contentArea, isButtonClick = false) {
        let textInput = contentArea.querySelector(".image-text-input");
        if (isButtonClick && textInput) {
            // If it's a button click and text input exists, remove it
            contentArea.removeChild(textInput);
        }
        else if (!textInput) {
            // If text input doesn't exist, create and append it
            textInput = document.createElement("div");
            textInput.className = "image-text-input";
            textInput.setAttribute("placeholder", "Add text context...");
            textInput.contentEditable = "true";
            textInput.style.display = "block";
            // Focus Handling
            textInput.addEventListener("focus", () => {
                if (document.activeElement !== textInput) {
                    document.activeElement?.blur();
                }
            });
            // Key Events Handling
            textInput.addEventListener("keydown", (event) => {
                event.stopPropagation();
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    textInput?.blur();
                }
                if (event.key === "Escape") {
                    textInput?.blur();
                }
            });
            textInput.addEventListener("keypress", (event) => {
                event.stopPropagation();
            });
            // Blur Handling
            textInput.addEventListener("blur", () => {
                if (textInput &&
                    textInput.textContent &&
                    !textInput.textContent.trim()) {
                    contentArea.removeChild(textInput);
                }
            });
            contentArea.appendChild(textInput);
            textInput.focus();
        }
    }
    function parseTimestamp(timestampString) {
        const parts = timestampString.split(":");
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        return minutes * 60 + seconds;
    }
    const footer = document.createElement("div");
    footer.className = "footer";
    footer.addEventListener("click", (e) => {
        const target = e.target;
        if (target.classList.contains("icon") ||
            target.tagName === "BUTTON" ||
            target.closest(".formatting_toolbar")) {
            return;
        }
        textEditor.focus();
    });
    const formContainer = document.createElement("div");
    formContainer.className = "form_container";
    const screenshotIcon = document.createElement("span");
    screenshotIcon.className = "material-symbols-outlined icon camera";
    screenshotIcon.textContent = "photo_camera";
    screenshotIcon.title = "Capture YouTube frame";
    screenshotIcon.addEventListener("click", async () => {
        try {
            const dataUrl = await captureYouTubeFrame();
            const currentTime = formatTime(document.querySelector("video")?.currentTime || 0);
            if (dataUrl) {
                addToMainBody("image", dataUrl, currentTime);
                textEditor.focus();
            }
        }
        catch (err) {
            console.error("Screenshot error:", err);
            alert("Error capturing YouTube frame: " +
                (err instanceof Error ? err.message : String(err)));
        }
    });
    formContainer.appendChild(screenshotIcon);
    const pinIcon = document.createElement("span");
    pinIcon.className = "material-symbols-outlined icon pin";
    pinIcon.textContent = "push_pin";
    pinIcon.title = "Pin current timestamp";
    pinIcon.addEventListener("click", () => {
        const video = document.querySelector("video");
        if (video) {
            pinTimestamp(video);
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
            document.activeElement?.blur();
        }
    });
    textEditor.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (textEditor.textContent?.trim() !== "") {
                const currentTime = formatTime(document.querySelector("video")?.currentTime || 0);
                addToMainBody("text", textEditor.innerHTML, currentTime);
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
    function toggleHighlight(element) {
        element.classList.toggle("highlighted");
    }
    async function captureYouTubeFrame() {
        const youtubeVideo = document.querySelector("video");
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
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }
    makeDraggable(floatingDiv);
    document.body.appendChild(floatingDiv);
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

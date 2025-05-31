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
    // Left side - Logo
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
    // Right side - Menu and Close buttons
    const rightSection = document.createElement("div");
    rightSection.className = "menu_icons_right";
    // Menu options (three dots)
    const menuOptions = document.createElement("div");
    menuOptions.className = "menu_options";
    menuOptions.innerHTML = `<span class="material-symbols-outlined icon more" style="border: none">more_vert</span>`;
    // Create the dropdown menu
    const optionsMenu = document.createElement("div");
    optionsMenu.className = "options-menu";
    // Create "Help Notebook" button
    const helpButton = document.createElement("button");
    helpButton.className = "option-button";
    helpButton.innerHTML = `
    <i class="material-symbols-outlined">help</i>
    <span>Help Notebook</span>
  `;
    // Create "Log Out" button
    const logoutButton = document.createElement("button");
    logoutButton.className = "option-button";
    logoutButton.innerHTML = `
    <span>Log Out</span>
    <span class="material-symbols-outlined logout-menu-icon">logout</span>
  `;
    // Append buttons to the dropdown menu
    optionsMenu.appendChild(helpButton);
    optionsMenu.appendChild(logoutButton);
    menuOptions.appendChild(optionsMenu);
    // Initially hide the dropdown menu
    optionsMenu.style.display = "none";
    // Add click event listener to toggle the dropdown
    menuOptions.addEventListener("click", (event) => {
        optionsMenu.style.display =
            optionsMenu.style.display === "block" ? "none" : "block";
        event.stopPropagation();
    });
    // Close the menu when clicking outside
    document.addEventListener("click", (event) => {
        if (!menuOptions.contains(event.target)) {
            optionsMenu.style.display = "none";
        }
    });
    // Close button
    const closeButton = document.createElement("span");
    closeButton.className = "material-symbols-outlined icon close";
    closeButton.textContent = "close";
    closeButton.addEventListener("click", () => {
        floatingDiv.remove();
    });
    // Assemble the header
    rightSection.appendChild(menuOptions);
    rightSection.appendChild(closeButton);
    headerBar.appendChild(logoLink);
    headerBar.appendChild(rightSection);
    floatingDiv.appendChild(headerBar);
    const mainBody = document.createElement("div");
    mainBody.className = "main_body";
    const topRow = document.createElement("div");
    topRow.className = "top_row";
    const magicIcon = document.createElement("span");
    magicIcon.className = "material-symbols-outlined icon book_4_spark";
    magicIcon.textContent = "book_4";
    const summarizeIcon = document.createElement("span");
    summarizeIcon.className = "material-symbols-outlined icon summarize";
    summarizeIcon.textContent = "summarize";
    summarizeIcon.title = "Generate Summary";
    // Add summarize functionality to the top row button
    summarizeIcon.addEventListener("click", async () => {
        try {
            const videoId = new URL(window.location.href).searchParams.get("v");
            if (!videoId) {
                throw new Error("No video ID found");
            }
            // Show loading state
            summarizeIcon.textContent = "hourglass_empty";
            // Get transcript
            const transcriptResponse = await fetch(`https://api.supadata.ai/v1/youtube/transcript?video_id=${videoId}`);
            const transcriptData = await transcriptResponse.json();
            if (transcriptData.error) {
                throw new Error(transcriptData.error);
            }
            // Get summary
            const summaryResponse = await fetch("http://localhost:5000/summarize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ transcript: transcriptData.transcript }),
            });
            const summaryData = await summaryResponse.json();
            if (summaryData.error) {
                throw new Error(summaryData.error);
            }
            // Add summary to the UI
            addToMainBody("text", summaryData.summary, undefined, true);
        }
        catch (error) {
            console.error("Summarization error:", error);
            // Show error in UI
            addToMainBody("text", `Error: ${error instanceof Error ? error.message : "Unknown error"}`, undefined, true);
        }
        finally {
            // Reset button state
            summarizeIcon.textContent = "summarize";
        }
    });
    // Add the icons to the topRow div
    topRow.appendChild(magicIcon);
    topRow.appendChild(summarizeIcon);
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
                        contentArea.addEventListener("keydown", (e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                contentArea.blur();
                            }
                        });
                        contentArea.addEventListener("keypress", (e) => {
                            e.stopPropagation();
                        });
                        contentArea.addEventListener("keyup", (e) => {
                            e.stopPropagation();
                        });
                    }
                });
                contentArea.addEventListener("blur", () => {
                    contentArea.contentEditable = "false";
                    contentArea.removeEventListener("keydown", stopPropagation);
                    contentArea.removeEventListener("keypress", stopPropagation);
                    contentArea.removeEventListener("keyup", stopPropagation);
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
        // Only add timestamp container if there's a timestamp and it's not a summary (pin === false)
        if (timestamp && !pin) {
            const timestampContainer = document.createElement("div");
            timestampContainer.className = "timestamp-container";
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
            const deleteButton = document.createElement("span");
            deleteButton.className = "delete-button material-symbols-outlined";
            deleteButton.textContent = "delete";
            deleteButton.addEventListener("click", () => {
                contentDiv.remove();
            });
            timestampContainer.appendChild(deleteButton);
            contentDiv.appendChild(timestampContainer);
        }
        else {
            // Always add delete button even without timestamp
            const deleteContainer = document.createElement("div");
            deleteContainer.className = "timestamp-container";
            const deleteButton = document.createElement("span");
            deleteButton.className = "delete-button material-symbols-outlined";
            deleteButton.textContent = "delete";
            deleteButton.addEventListener("click", () => {
                contentDiv.remove();
            });
            deleteContainer.appendChild(deleteButton);
            contentDiv.appendChild(deleteContainer);
        }
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
            textInput.addEventListener("keyup", (event) => {
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
    const saveIcon = document.createElement("span");
    saveIcon.className = "material-symbols-outlined icon save";
    saveIcon.textContent = "save";
    saveIcon.title = "Save note";
    saveIcon.style.display = "inline-flex";
    saveIcon.addEventListener("click", async () => {
        const mainBody = document.querySelector(".main_body");
        if (!mainBody)
            return;
        // Get all content items from the main body
        const contentItems = mainBody.querySelectorAll(".content-item");
        if (contentItems.length === 0) {
            showNotification("No content to save!");
            return;
        }
        // Save each content item separately
        let savedCount = 0;
        // Use Promise.all to properly handle async operations
        await Promise.all(Array.from(contentItems).map(async (item) => {
            const contentArea = item.querySelector(".content-area");
            const timestampContainer = item.querySelector(".timestamp-container");
            const timestampText = timestampContainer?.querySelector(".clickable-timestamp span:last-child");
            if (contentArea && contentArea.innerHTML.trim()) {
                const timestamp = timestampText?.textContent || "0:00";
                // First, try to find an image
                const imgElement = contentArea.querySelector("img");
                console.log("Found image element:", imgElement);
                if (imgElement && imgElement.src) {
                    console.log("Saving image with src:", imgElement.src.substring(0, 50) + "...");
                    // Check if there's an annotation
                    const annotationElement = contentArea.querySelector(".image-text-input");
                    const annotationText = annotationElement?.textContent?.trim();
                    if (annotationText) {
                        // Save both image and annotation
                        const contentToSave = JSON.stringify({
                            image: imgElement.src,
                            annotation: annotationText
                        });
                        const saved = await saveNoteToBackend(contentToSave, timestamp, "image+annotation");
                        if (saved)
                            savedCount++;
                    }
                    else {
                        // Save just the image
                        const saved = await saveNoteToBackend(imgElement.src, timestamp, "image");
                        if (saved)
                            savedCount++;
                    }
                }
                else {
                    // If no image found, save as text
                    const textContent = cleanContent(contentArea.innerHTML);
                    if (textContent && !textContent.includes("text_fields")) {
                        const saved = await saveNoteToBackend(textContent, timestamp, "text");
                        if (saved)
                            savedCount++;
                    }
                }
            }
        }));
        if (savedCount > 0) {
            showNotification(`${savedCount} note${savedCount > 1 ? "s" : ""} saved successfully!`);
            // Clear the main body content after saving
            clearMainBody();
        }
        else {
            showNotification("No content to save!");
        }
    });
    function clearMainBody() {
        const mainBody = document.querySelector(".main_body");
        if (mainBody) {
            mainBody.innerHTML = ""; // Clear all content
            // Add back the top row
            const topRow = document.createElement("div");
            topRow.className = "top_row";
            const magicIcon = document.createElement("span");
            magicIcon.className = "material-symbols-outlined icon book_4_spark";
            magicIcon.textContent = "book_4";
            const summarizeIcon = document.createElement("span");
            summarizeIcon.className = "material-symbols-outlined icon summarize";
            summarizeIcon.textContent = "summarize";
            summarizeIcon.title = "Generate Summary";
            topRow.appendChild(magicIcon);
            topRow.appendChild(summarizeIcon);
            mainBody.appendChild(topRow);
        }
    }
    // Add this function to clean up content
    function cleanContent(content) {
        // NEVER clean image data - return as-is
        if (content.startsWith('data:image/') || content.startsWith('blob:')) {
            return content;
        }
        // Create a temporary div to handle HTML content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        // First, handle line breaks and convert them to newlines
        let html = tempDiv.innerHTML
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<div>/gi, "\n")
            .replace(/<\/div>/gi, "\n");
        // Create another temp div to decode HTML entities
        const decodingDiv = document.createElement("div");
        decodingDiv.innerHTML = html;
        html = decodingDiv.textContent || decodingDiv.innerText || "";
        // Clean up the text
        return (html
            // Replace multiple spaces with single space
            .replace(/\s+/g, " ")
            // Replace multiple newlines with at most two
            .replace(/\n\s*\n\s*\n/g, "\n\n")
            // Remove spaces before newlines
            .replace(/\s+\n/g, "\n")
            // Remove spaces after newlines
            .replace(/\n\s+/g, "\n")
            // Remove any HTML entities that might remain
            .replace(/&[a-z]+;/gi, " ")
            // Final trim
            .trim());
    }
    // Function to get video category
    // async function getVideoCategory(videoId: string): Promise<string> {
    //   try {
    //     const response = await fetch(
    //       `http://localhost:5000/api/videos/category/${videoId}`
    //     );
    //     const data = await response.json();
    //     if (data.error) {
    //       console.error("Error getting video category:", data.error);
    //       return "Uncategorized";
    //     }
    //     // Map YouTube categories to our categories
    //     const category = data.category;
    //     if (category.includes("Science") || category.includes("Technology")) {
    //       return "Science & Technology";
    //     } else if (
    //       category.includes("Education") ||
    //       category.includes("Learning")
    //     ) {
    //       return "Education";
    //     } else if (category.includes("Gaming") || category.includes("Game")) {
    //       return "Gaming";
    //     } else if (
    //       category.includes("Entertainment") ||
    //       category.includes("Music") ||
    //       category.includes("Comedy")
    //     ) {
    //       return "Entertainment";
    //     }
    //     return "Uncategorized";
    //   } catch (error) {
    //     console.error("Error fetching video category:", error);
    //     return "Uncategorized";
    //   }
    // }
    async function saveNoteToBackend(content, timestamp, contentType) {
        try {
            const videoId = new URLSearchParams(window.location.search).get("v");
            if (!videoId) {
                showNotification("No video ID found!");
                return false;
            }
            // Handle content based on type
            let processedContent = content;
            if (contentType === "image") {
                // For images, don't clean the content - preserve the data URL or blob URL
                if (!content.startsWith('data:image/') && !content.startsWith('blob:') && !content.startsWith('http')) {
                    showNotification("Invalid image format!");
                    return false;
                }
                processedContent = content; // Keep image data as-is
            }
            else {
                // Clean text content
                const cleanedContent = cleanContent(content);
                // Don't save if content is empty after cleaning
                if (!cleanedContent.trim()) {
                    showNotification("Content is empty after cleaning!");
                    return false;
                }
                processedContent = cleanedContent;
            }
            // Get video category before saving
            // const category = await getVideoCategory(videoId);
            const noteData = {
                videoId: videoId,
                videoTitle: document.title.replace(" - YouTube", ""),
                videoUrl: window.location.href,
                content: processedContent, // Use processed content
                contentType: contentType,
                // category: category,
                isPinned: false,
                timestamp: timestamp,
            };
            console.log('Saving note data:', {
                ...noteData,
                content: contentType === "image" ? `[IMAGE DATA - ${content.length} chars]` : noteData.content.substring(0, 100) + '...'
            });
            const response = await fetch("http://localhost:5000/api/videos/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(noteData),
            });
            if (response.ok) {
                const responseData = await response.json();
                console.log('Note saved successfully:', responseData);
                // Notify the main app to refresh notes
                window.postMessage({ type: "REFRESH_NOTES", source: "video_summarizer" }, "*");
                showNotification("Note saved successfully!");
                return true;
            }
            else {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                showNotification(`Failed to save note: ${errorData.error || "Unknown error"}`);
                return false;
            }
        }
        catch (error) {
            console.error("Error saving note:", error);
            showNotification("Error saving note. Please try again.");
            return false;
        }
    }
    formContainer.appendChild(screenshotIcon);
    formContainer.appendChild(saveIcon);
    function showNotification(message) {
        const notification = document.createElement("div");
        notification.className = "floating-notification";
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
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
        inputWrapper.style.width = "100%";
        // 🔸 Forcefully blur other active elements
        const active = document.activeElement;
        if (active && active !== textEditor) {
            active.blur();
        }
        // 🔸 Refocus after blur (ensures correct state)
        setTimeout(() => {
            textEditor.focus();
        }, 0);
    });
    textEditor.addEventListener("keydown", (e) => {
        // Stop event propagation to prevent YouTube video controls
        e.stopPropagation();
        const active = document.activeElement;
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
        // Stop event propagation to prevent YouTube video controls
        e.stopPropagation();
    });
    textEditor.addEventListener("keyup", (e) => {
        // Stop event propagation to prevent YouTube video controls
        e.stopPropagation();
    });
    textEditor.addEventListener("blur", () => {
        if (textEditor.textContent?.trim() === "") {
            textEditor.textContent = "Add a note";
            textEditor.style.color = "#999";
        }
        formattingToolbar.style.display = "none";
        screenshotIcon.style.display = "inline-flex";
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
}
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = function (e) {
        // 🧠 Ignore drag if clicked on input/textarea/contentEditable
        const target = e.target;
        if (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable) {
            return;
        }
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
//# sourceMappingURL=content.js.map
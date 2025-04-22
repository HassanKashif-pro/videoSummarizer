"use strict";
document.addEventListener("DOMContentLoaded", () => {
    const noteInput = document.getElementById("noteInput");
    const screenshotInput = document.getElementById("screenshotInput");
    const saveButton = document.getElementById("saveButton");
    // Function to get current video info from the YouTube page
    const getCurrentVideoInfo = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getVideoInfo" }, (response) => {
                    if (response) {
                        resolve({
                            title: response.videoTitle || "Unknown Title",
                            id: response.videoId || "Unknown ID",
                            url: `https://www.youtube.com/watch?v=${response.videoId}`,
                        });
                    }
                    else {
                        resolve({
                            title: "Unknown Title",
                            id: "Unknown ID",
                            url: "Unknown URL",
                        });
                    }
                });
            });
        });
    };
    // Function to convert a file to Base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };
    // Function to send note data to the website
    const sendNoteToWebsite = (payload) => {
        chrome.tabs.create({ url: "https://app.videonotebook.com/notebooks" }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.sendMessage(tabId, { action: "addNote", noteData: payload }, (response) => {
                        if (response && response.success) {
                            noteInput.value = "";
                            screenshotInput.value = ""; // Clear file input
                            alert("Note saved successfully!");
                        }
                    });
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            });
        });
    };
    // Handle saving the note
    const handleSaveNote = async (noteContent, screenshot) => {
        const videoInfo = await getCurrentVideoInfo();
        let screenshotBase64 = null;
        if (screenshot) {
            try {
                screenshotBase64 = await fileToBase64(screenshot);
            }
            catch (error) {
                console.error("Error converting screenshot to Base64:", error);
            }
        }
        const payload = {
            videoTitle: videoInfo.title,
            videoId: videoInfo.id,
            videoUrl: videoInfo.url,
            note: noteContent,
            screenshot: screenshotBase64, // Base64 string or null
            timestamp: new Date().toISOString(),
            category: "Entertainment", // Matches Sidebar.tsx category
        };
        sendNoteToWebsite(payload);
    };
    // Handle save button click
    saveButton.addEventListener("click", async () => {
        const noteContent = noteInput.value.trim();
        if (!noteContent) {
            alert("Please enter a note!");
            return;
        }
        const screenshot = screenshotInput.files && screenshotInput.files[0]
            ? screenshotInput.files[0]
            : undefined;
        await handleSaveNote(noteContent, screenshot);
    });
});

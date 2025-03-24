"use strict";
// Function to fetch and update video summary
async function fetchVideoSummary() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0].url) {
            updateSummaryText("No active tab found.");
            return;
        }
        const url = tabs[0].url; // Extract URL from active tab
        // Validate it's a YouTube video URL
        if (!url.includes("youtube.com/watch")) {
            updateSummaryText("Open a YouTube video first.");
            return;
        }
        // Send request to the backend server
        const response = await fetch("http://localhost:5000/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoUrl: url }),
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        const data = await response.json();
        updateSummaryText(data.summary || "No summary available.");
    }
    catch (error) {
        console.error("Fetch error:", error);
        updateSummaryText("Failed to fetch summary.");
    }
}
// Helper function to update UI safely
function updateSummaryText(message) {
    const summaryElement = document.getElementById("summary");
    if (summaryElement) {
        summaryElement.textContent = message;
    }
    else {
        console.error("Summary element not found.");
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("closeBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            window.close(); // Closes the popup
        });
    }
});
// Run the function when the popup loads
document.addEventListener("DOMContentLoaded", fetchVideoSummary);

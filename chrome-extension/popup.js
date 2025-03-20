"use strict";
// Get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const url = tabs[0]?.url; // Ensure we have a valid URL
  // Ensure it's a YouTube video
  if (!url || !url.includes("youtube.com/watch")) {
    const summaryElement = document.getElementById("summary");
    if (summaryElement) {
      summaryElement.innerText = "Open a YouTube video first.";
    }
    return;
  }
  // Send request to your backend
  try {
    const response = await fetch("http://127.0.0.1:5000/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: url }),
    });
    const data = await response.json();
    const summaryElement = document.getElementById("summary");
    if (summaryElement) {
      summaryElement.innerText = data.summary || "Error fetching summary.";
    }
  } catch (error) {
    const summaryElement = document.getElementById("summary");
    if (summaryElement) {
      summaryElement.innerText = "Failed to fetch summary.";
    }
  }
});

// Ensure script runs only when Chrome extension loads
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  if (!tabs || tabs.length === 0) {
    console.error("No active tab found.");
    return;
  }

  const url = tabs[0]?.url; // Get URL from active tab

  // Validate it's a YouTube video URL
  if (!url || !url.includes("youtube.com/watch")) {
    updateSummaryText("Open a YouTube video first.");
    return;
  }

  try {
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
  } catch (error) {
    console.error("Fetch error:", error);
    updateSummaryText("Failed to fetch summary.");
  }
});

// Helper function to update UI safely
function updateSummaryText(message: string) {
  const summaryElement = document.getElementById("summary");
  if (summaryElement) {
    summaryElement.innerText = message;
  } else {
    console.error("Summary element not found.");
  }
}

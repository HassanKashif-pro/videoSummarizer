console.log("Injected into YouTube!");

// Wait for the YouTube player to load
const checkInterval = setInterval(() => {
  const videoPlayer = document.querySelector(".html5-video-player"); // Select the YouTube video container

  if (videoPlayer && !document.getElementById("summify-watermark")) {
    clearInterval(checkInterval);

    // Create the watermark button
    const watermark = document.createElement("div");
    watermark.id = "summify-watermark";
    watermark.innerText = "S";
    watermark.style.position = "absolute";
    watermark.style.top = "10px"; // Top-right corner
    watermark.style.right = "10px"; // Top-right corner
    watermark.style.width = "30px";
    watermark.style.height = "30px";
    watermark.style.background = "#ff3131";
    watermark.style.color = "#fff";
    watermark.style.imageRendering = "/icons/SUMMIFY.png";
    watermark.style.display = "flex";
    watermark.style.alignItems = "center";
    watermark.style.justifyContent = "center";
    watermark.style.borderRadius = "20%";
    watermark.style.cursor = "pointer";
    watermark.style.zIndex = "9999";

    // Add click event to show popup
    watermark.addEventListener("click", () => {
      console.log("Watermark clicked!");
      chrome.runtime.sendMessage({ action: "open_popup" });
    });

    // Append watermark to the YouTube player
    videoPlayer.appendChild(watermark);
    console.log("✅ Watermark added inside the YouTube video container!");
  }
}, 1000); // Check every second until the video player is found

console.log("Injected into YouTube!");

const checkInterval = setInterval(() => {
  const videoPlayer = document.querySelector(".html5-video-player");

  if (videoPlayer && !document.getElementById("summify-watermark")) {
    clearInterval(checkInterval);

    // Create watermark container
    const watermark = document.createElement("div");
    watermark.id = "summify-watermark";

    // ✅ Create logo image (always visible)
    const logoImage = document.createElement("img");
    logoImage.src = chrome.runtime.getURL("icons/image.png"); // Ensure the correct path
    logoImage.alt = "Summify Logo";

    // ✅ Create text span (hidden until hover)
    const textSpan = document.createElement("span");
    textSpan.innerText = " Open Summify →";

    // Append elements
    watermark.appendChild(logoImage);
    watermark.appendChild(textSpan);

    // Click event to open popup
    watermark.addEventListener("click", () => {
      console.log("Watermark clicked!");
      chrome.runtime.sendMessage({ action: "open_popup" });
    });

    // Append watermark to YouTube player
    videoPlayer.appendChild(watermark);
    console.log("✅ Watermark added!");
  }
}, 1000);

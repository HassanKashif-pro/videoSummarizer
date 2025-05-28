"use strict";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📩 Message received in service worker:", message);
    if (message.action === "open_popup") {
        chrome.action.openPopup();
        sendResponse({ status: "✅ Popup opened!" });
    }
});
//# sourceMappingURL=service-worker.js.map
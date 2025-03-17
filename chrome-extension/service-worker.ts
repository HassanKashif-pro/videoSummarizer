chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        alert("Hello from my extension!");
      },
    });
  } else {
    console.error("Tab ID is undefined, cannot execute script.");
  }
});

interface VideoInfo {
  title: string;
  id: string;
  url: string;
}

interface NotePayload {
  videoTitle: string;
  videoId: string;
  videoUrl: string;
  note: string;
  screenshot: string | null;
  timestamp: string;
  category: string;
}

document.addEventListener("DOMContentLoaded", () => {
  const noteInput = document.getElementById("noteInput") as HTMLTextAreaElement;
  const screenshotInput = document.getElementById(
    "screenshotInput"
  ) as HTMLInputElement;
  const saveButton = document.getElementById("saveButton") as HTMLButtonElement;

  // Function to get current video info from the YouTube page
  const getCurrentVideoInfo = (): Promise<VideoInfo> => {
    return new Promise((resolve) => {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs: chrome.tabs.Tab[]) => {
          chrome.tabs.sendMessage(
            tabs[0].id!,
            { action: "getVideoInfo" },
            (response: { videoTitle: string; videoId: string } | undefined) => {
              if (response) {
                resolve({
                  title: response.videoTitle || "Unknown Title",
                  id: response.videoId || "Unknown ID",
                  url: `https://www.youtube.com/watch?v=${response.videoId}`,
                });
              } else {
                resolve({
                  title: "Unknown Title",
                  id: "Unknown ID",
                  url: "Unknown URL",
                });
              }
            }
          );
        }
      );
    });
  };

  // Function to convert a file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Function to send note data to the website
  const sendNoteToWebsite = (payload: NotePayload): void => {
    chrome.tabs.create(
      { url: "https://app.videonotebook.com/notebooks" },
      (tab: chrome.tabs.Tab) => {
        chrome.tabs.onUpdated.addListener(function listener(
          tabId: number,
          changeInfo: chrome.tabs.TabChangeInfo
        ) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            chrome.tabs.sendMessage(
              tabId,
              { action: "addNote", noteData: payload },
              (response: { success: boolean } | undefined) => {
                if (response && response.success) {
                  noteInput.value = "";
                  screenshotInput.value = ""; // Clear file input
                  alert("Note saved successfully!");
                }
              }
            );
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      }
    );
  };

  // Handle saving the note
  const handleSaveNote = async (
    noteContent: string,
    screenshot?: File
  ): Promise<void> => {
    const videoInfo = await getCurrentVideoInfo();
    let screenshotBase64: string | null = null;
    if (screenshot) {
      try {
        screenshotBase64 = await fileToBase64(screenshot);
      } catch (error) {
        console.error("Error converting screenshot to Base64:", error);
      }
    }

    const payload: NotePayload = {
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

    const screenshot =
      screenshotInput.files && screenshotInput.files[0]
        ? screenshotInput.files[0]
        : undefined;
    await handleSaveNote(noteContent, screenshot);
  });
});

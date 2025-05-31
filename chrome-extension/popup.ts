interface VideoInfo {
  title: string;
  id: string;
  url: string;
}

interface NotePayload {
  videoTitle: string;
  videoId: string;
  videoUrl: string;
  content: string;  // Changed from 'note' to 'content'
  contentType: string;  // Added contentType field
  timestamp: string;
  category: string;
  isPinned: boolean;
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
  const sendNoteToWebsite = async (payload: NotePayload): Promise<void> => {
    try {
      console.log('Sending payload:', {
        ...payload,
        content: payload.contentType === 'image' ? '[IMAGE DATA]' : payload.content
      });

      const response = await fetch("http://localhost:3001/api/videos/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Note saved successfully:', responseData);
        
        // Clear inputs
        noteInput.value = "";
        screenshotInput.value = "";
        
        alert("Note saved successfully!");
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        alert(`Failed to save note: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Error saving note. Please try again.");
    }
  };

  // Function to save a text note
  const saveTextNote = async (noteContent: string): Promise<void> => {
    const videoInfo = await getCurrentVideoInfo();

    const payload: NotePayload = {
      videoTitle: videoInfo.title,
      videoId: videoInfo.id,
      videoUrl: videoInfo.url,
      content: noteContent,
      contentType: "text",
      timestamp: new Date().toISOString(),
      category: "Entertainment",
      isPinned: false,
    };

    await sendNoteToWebsite(payload);
  };

  // Function to save an image note
  const saveImageNote = async (screenshot: File): Promise<void> => {
    const videoInfo = await getCurrentVideoInfo();
    
    try {
      console.log('=== IMAGE DEBUGGING ===');
    console.log('File name:', screenshot.name);
    console.log('File type:', screenshot.type);
    console.log('File size:', screenshot.size);
    
      const screenshotBase64 = await fileToBase64(screenshot);
      
      // Validate image format
      if (!screenshotBase64.startsWith('data:image/')) {
        alert("Invalid image format!");
        return;
      }

      const payload: NotePayload = {
        videoTitle: videoInfo.title,
        videoId: videoInfo.id,
        videoUrl: videoInfo.url,
        content: screenshotBase64, // Image data goes in content field
        contentType: "image",       // Mark as image type
        timestamp: new Date().toISOString(),
        category: "Entertainment",
        isPinned: false,
      };

      await sendNoteToWebsite(payload);
    } catch (error) {
      console.error("Error converting screenshot to Base64:", error);
      alert("Error processing image. Please try again.");
    }
  };

  // Handle save button click
  saveButton.addEventListener("click", async () => {
    const noteContent = noteInput.value.trim();
    const screenshot = screenshotInput.files && screenshotInput.files[0] 
      ? screenshotInput.files[0] 
      : null;

    // Validate input
    if (!noteContent && !screenshot) {
      alert("Please enter a note or select an image!");
      return;
    }

    try {
      // If both text and image are provided, save them separately
      if (noteContent && screenshot) {
        await saveTextNote(noteContent);
        await saveImageNote(screenshot);
        alert("Both note and image saved successfully!");
      } 
      // If only text is provided
      else if (noteContent) {
        await saveTextNote(noteContent);
      } 
      // If only image is provided
      else if (screenshot) {
        await saveImageNote(screenshot);
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving. Please try again.");
    }
  });
});
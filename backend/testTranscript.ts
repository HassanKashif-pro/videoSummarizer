const { getTranscript } = require("youtube-transcript-api");

const testVideoId = "2TL3DgIMY1g"; // Replace with a known video ID that has captions

const fetchTranscript = async (videoId: string) => {
  try {
    console.log("📥 Fetching transcript for video ID:", videoId);

    const captions = await getTranscript(videoId);
    console.log("🔍 Raw Captions:", captions);

    if (!captions || captions.length === 0) {
      console.error("❌ No captions found for this video.");
      return;
    }

    const transcript = captions.map((c: { text: any }) => c.text).join(" ");
    console.log("✅ Transcript:", transcript);
  } catch (error: any) {
    console.error("❌ Error fetching transcript:", error.message);
  }
};

// Run the test
fetchTranscript(testVideoId);

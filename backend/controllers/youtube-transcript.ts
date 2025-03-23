import Transcript from "youtube-transcript";

export const fetchTranscript = async (videoId: string) => {
  try {
    const captions = await getTranscript(videoId);
    // process captions
  } catch (error) {
    console.error("Error fetching transcript:", error);
  }
};

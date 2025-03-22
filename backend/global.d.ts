declare module "youtube-transcript-api" {
  export function getTranscript(videoId: string): Promise<{ text: string }[]>;
}

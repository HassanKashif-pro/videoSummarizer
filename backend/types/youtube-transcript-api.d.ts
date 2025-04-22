declare module "youtube-transcript-api" {
  interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
  }

  function getTranscript(
    videoId: string,
    options?: {
      lang?: string;
      country?: string;
    }
  ): Promise<TranscriptSegment[]>;

  export { getTranscript, TranscriptSegment };
}

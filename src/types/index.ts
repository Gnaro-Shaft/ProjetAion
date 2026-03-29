export type PostType = 'observation' | 'alien' | 'rapport' | 'experience';

export interface AionScript {
  title: string;
  script: string;
  type: PostType;
  hashtags: string[];
  keywords: string[]; // Mots-clés pour la recherche d'images
}

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface AudioResult {
  filePath: string;
  durationMs: number;
  wordTimings: WordTiming[];
}

export interface VideoResult {
  filePath: string;
  durationMs: number;
  width: number;
  height: number;
}

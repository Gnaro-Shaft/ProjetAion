import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config/index.js';
import type { AudioResult, WordTiming } from '../types/index.js';

function getAudioDurationMs(filePath: string): number {
  const result = execSync(
    `ffprobe -v quiet -print_format json -show_format "${filePath}"`,
    { encoding: 'utf-8' }
  );
  const info = JSON.parse(result);
  return Math.ceil(parseFloat(info.format.duration) * 1000);
}

interface AlignmentData {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

function alignmentToWordTimings(alignment: AlignmentData): WordTiming[] {
  const timings: WordTiming[] = [];
  let currentWord = '';
  let wordStart = 0;
  let wordEnd = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i];
    const startTime = alignment.character_start_times_seconds[i];
    const endTime = alignment.character_end_times_seconds[i];

    if (char === ' ' || char === '\n') {
      if (currentWord.length > 0) {
        timings.push({
          word: currentWord,
          startMs: Math.round(wordStart * 1000),
          endMs: Math.round(wordEnd * 1000),
        });
        currentWord = '';
      }
    } else {
      if (currentWord.length === 0) {
        wordStart = startTime;
      }
      currentWord += char;
      wordEnd = endTime;
    }
  }

  // Dernier mot
  if (currentWord.length > 0) {
    timings.push({
      word: currentWord,
      startMs: Math.round(wordStart * 1000),
      endMs: Math.round(wordEnd * 1000),
    });
  }

  return timings;
}

export async function synthesizeVoice(
  text: string,
  outputDir?: string
): Promise<AudioResult> {
  const dir = outputDir || config.paths.temp;
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `aion-${Date.now()}.mp3`;
  const filePath = path.join(dir, fileName);

  // Utiliser l'endpoint with-timestamps pour obtenir l'audio + alignement
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabs.voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': config.elevenlabs.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    audio_base64: string;
    alignment: AlignmentData;
  };

  // Sauvegarder l'audio
  const audioBuffer = Buffer.from(data.audio_base64, 'base64');
  fs.writeFileSync(filePath, audioBuffer);

  const durationMs = getAudioDurationMs(filePath);

  // Extraire les timings mot par mot
  const wordTimings = alignmentToWordTimings(data.alignment);

  return { filePath, durationMs, wordTimings };
}

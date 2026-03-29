import dotenv from 'dotenv';
import path from 'path';

const root = process.cwd();
dotenv.config({ path: path.resolve(root, '.env'), override: true });

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '',
  },
  remotion: {
    concurrency: parseInt(process.env.REMOTION_CONCURRENCY || '4'),
  },
  paths: {
    root,
    output: path.resolve(root, 'output'),
    temp: path.resolve(root, 'temp'),
    prompts: path.resolve(root, 'prompts'),
  },
} as const;

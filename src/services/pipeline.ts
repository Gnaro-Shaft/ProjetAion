import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import { generateScript } from './script-generator.js';
import { synthesizeVoice } from './voice-synthesizer.js';
import { renderVideo } from './video-renderer.js';
import { postProcess } from './post-processor.js';
import { searchAndDownloadImages } from './image-search.js';
import type { PostType, AionScript, WordTiming } from '../types/index.js';

interface SubtitleSegment {
  text: string;
  startFrame: number;
  endFrame: number;
  words: Array<{ word: string; startFrame: number; endFrame: number }>;
}

const VOICE_DELAY_FRAMES = 60; // 2s de délai pour le son signature

function buildSubtitlesFromTimings(wordTimings: WordTiming[], fps: number = 30): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const wordsPerSegment = 5;

  for (let i = 0; i < wordTimings.length; i += wordsPerSegment) {
    const group = wordTimings.slice(i, i + wordsPerSegment);

    const words = group.map((wt) => ({
      word: wt.word,
      startFrame: Math.round((wt.startMs / 1000) * fps) + VOICE_DELAY_FRAMES,
      endFrame: Math.round((wt.endMs / 1000) * fps) + VOICE_DELAY_FRAMES,
    }));

    segments.push({
      text: group.map((wt) => wt.word).join(' '),
      startFrame: words[0].startFrame,
      endFrame: words[words.length - 1].endFrame + Math.round(fps * 0.3),
      words,
    });
  }

  return segments;
}

interface PipelineOptions {
  type: PostType;
  topic?: string;
  skipRender?: boolean;
}

interface PipelineResult {
  script: AionScript;
  videoPath?: string;
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { type, topic, skipRender } = options;
  const timestamp = Date.now();

  fs.mkdirSync(config.paths.temp, { recursive: true });
  fs.mkdirSync(config.paths.output, { recursive: true });

  const remotionPublicDir = path.resolve(config.paths.root, 'remotion/public');
  fs.mkdirSync(remotionPublicDir, { recursive: true });

  // Étape 1 : Générer le script
  console.log('[ 1/5 ] Génération du script AION...');
  const script = await generateScript(type, topic);
  console.log(`  → "${script.title}"`);
  console.log(`  → ${script.script.split(' ').length} mots`);
  console.log(`  → Keywords: ${script.keywords.join(', ')}`);

  const scriptPath = path.join(config.paths.output, `${timestamp}-script.json`);
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

  if (skipRender) {
    return { script };
  }

  // Étape 2 : Recherche d'images
  console.log('[ 2/5 ] Recherche d\'images Pexels...');
  const imageDir = path.join(remotionPublicDir, `images-${timestamp}`);
  const images = await searchAndDownloadImages(script.keywords, imageDir, 4);
  console.log(`  → ${images.length} images trouvées`);

  // Copier les images dans remotion/public/ et préparer les noms
  const imageFileNames = images.map((img) => {
    const fileName = path.basename(img.filePath);
    return `images-${timestamp}/${fileName}`;
  });

  // Étape 3 : Synthèse vocale
  console.log('[ 3/5 ] Synthèse vocale ElevenLabs...');
  const audio = await synthesizeVoice(script.script);
  console.log(`  → ${(audio.durationMs / 1000).toFixed(1)}s`);

  // Copier l'audio dans remotion/public/
  const audioFileName = `aion-audio-${timestamp}.mp3`;
  fs.copyFileSync(audio.filePath, path.join(remotionPublicDir, audioFileName));

  // Générer les sous-titres depuis les vrais timings audio
  const subtitles = buildSubtitlesFromTimings(audio.wordTimings);
  console.log(`  → ${subtitles.length} segments (${audio.wordTimings.length} mots timés)`);

  // Étape 4 : Rendu vidéo Remotion
  console.log('[ 4/5 ] Rendu vidéo Remotion + Three.js...');
  const rawVideoPath = path.join(config.paths.temp, `${timestamp}-raw.mp4`);
  await renderVideo({
    audioPath: audioFileName,
    durationMs: audio.durationMs,
    outputPath: rawVideoPath,
    images: imageFileNames,
    subtitles,
  });

  // Étape 5 : Post-processing FFmpeg
  console.log('[ 5/5 ] Post-processing FFmpeg...');
  const finalPath = path.join(config.paths.output, `aion-${timestamp}.mp4`);
  await postProcess(rawVideoPath, finalPath);
  console.log(`  → ${finalPath}`);

  // Nettoyage temp
  fs.unlinkSync(audio.filePath);
  fs.unlinkSync(rawVideoPath);
  fs.unlinkSync(path.join(remotionPublicDir, audioFileName));
  fs.rmSync(imageDir, { recursive: true, force: true });

  return { script, videoPath: finalPath };
}

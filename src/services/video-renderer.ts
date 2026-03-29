import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

interface RenderOptions {
  audioPath: string;
  durationMs: number;
  outputPath: string;
  images?: string[];
  subtitles?: Array<{ text: string; startFrame: number; endFrame: number }>;
}

export async function renderVideo(options: RenderOptions): Promise<string> {
  const { audioPath, durationMs, outputPath, images = [], subtitles = [] } = options;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const fps = 30;
  const durationInFrames = Math.ceil((durationMs / 1000) * fps) + 60; // +2s pour le son signature
  const remotionDir = path.resolve(config.paths.root, 'remotion');

  // Écrire les props dans un fichier temp pour éviter les problèmes de shell
  const propsFile = path.join(config.paths.temp, 'remotion-props.json');
  fs.writeFileSync(propsFile, JSON.stringify({ audioPath, durationMs, images, subtitles }));

  const cmd = [
    'npx remotion render',
    'src/Root.tsx',
    'AionVideo',
    `"${outputPath}"`,
    `--props="${propsFile}"`,
    `--frames=0-${durationInFrames - 1}`,
    '--concurrency=1',
    '--gl=angle',
  ].join(' ');

  try {
    execSync(cmd, { cwd: remotionDir, stdio: 'inherit' });
  } finally {
    // Nettoyer le fichier props
    if (fs.existsSync(propsFile)) fs.unlinkSync(propsFile);
  }

  return outputPath;
}

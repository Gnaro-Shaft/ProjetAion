import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import type { VideoResult } from '../types/index.js';

export function postProcess(
  inputPath: string,
  outputPath: string
): Promise<VideoResult> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('1080x1920')
      .videoBitrate('2500k')
      .audioBitrate('192k')
      .outputOptions(['-preset', 'medium', '-crf', '23', '-movflags', '+faststart'])
      .format('mp4')
      .on('end', () => {
        resolve({
          filePath: outputPath,
          durationMs: 0,
          width: 1080,
          height: 1920,
        });
      })
      .on('error', reject)
      .save(outputPath);
  });
}

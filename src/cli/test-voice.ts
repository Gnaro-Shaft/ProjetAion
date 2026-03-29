import { generateScript } from '../services/script-generator.js';
import { synthesizeVoice } from '../services/voice-synthesizer.js';

async function main() {
  console.log('Génération du script...');
  const script = await generateScript('rapport', 'abonnements inutiles');
  console.log(`Script: "${script.title}"`);
  console.log(script.script);
  console.log('');

  console.log('Synthèse vocale...');
  const audio = await synthesizeVoice(script.script);
  console.log(`Audio: ${audio.filePath}`);
  console.log(`Durée: ${(audio.durationMs / 1000).toFixed(1)}s`);
}

main().catch(console.error);

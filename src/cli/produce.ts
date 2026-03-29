import { runPipeline } from '../services/pipeline.js';
import type { PostType } from '../types/index.js';

const args = process.argv.slice(2);
const typeArg = args.find((a) => a.startsWith('--type='))?.split('=')[1] as PostType | undefined;
const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1];
const skipRender = args.includes('--script-only');

const type: PostType = typeArg || 'observation';

console.log(`\n🔮 AION — Pipeline de production`);
console.log(`   Type : ${type}`);
console.log(`   Sujet : ${topicArg || 'auto'}`);
console.log(`   Mode : ${skipRender ? 'script seul' : 'pipeline complet'}\n`);

runPipeline({ type, topic: topicArg, skipRender })
  .then((result) => {
    console.log('\n✓ Pipeline terminé');
    console.log(`  Script : "${result.script.title}"`);
    if (result.videoPath) {
      console.log(`  Vidéo  : ${result.videoPath}`);
    }
  })
  .catch((err) => {
    console.error('\n✗ Erreur pipeline:', err.message);
    process.exit(1);
  });

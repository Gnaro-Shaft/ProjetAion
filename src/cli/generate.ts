import { generateScript } from '../services/script-generator.js';
import type { PostType } from '../types/index.js';

const args = process.argv.slice(2);
const typeArg = args.find((a) => a.startsWith('--type='))?.split('=')[1] as PostType | undefined;
const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1];

const type: PostType = typeArg || 'observation';
const validTypes: PostType[] = ['observation', 'alien', 'rapport', 'experience'];

if (!validTypes.includes(type)) {
  console.error(`Type invalide: ${type}`);
  console.error(`Types valides: ${validTypes.join(', ')}`);
  process.exit(1);
}

console.log(`\n🔮 AION — Génération de script`);
console.log(`   Type : ${type}`);
console.log(`   Sujet : ${topicArg || 'auto'}\n`);

generateScript(type, topicArg)
  .then((script) => {
    console.log('─── SCRIPT ───');
    console.log(`Titre : ${script.title}`);
    console.log(`Type  : ${script.type}`);
    console.log(`Mots  : ${script.script.split(' ').length}`);
    console.log('');
    console.log(script.script);
    console.log('');
    console.log(`Hashtags : ${script.hashtags.join(' ')}`);
    console.log('──────────────\n');
  })
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exit(1);
  });

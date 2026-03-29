import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import type { AionScript, PostType } from '../types/index.js';

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const systemPrompt = fs.readFileSync(
  path.join(config.paths.prompts, 'aion-system.md'),
  'utf-8'
);

const typeInstructions: Record<PostType, string> = {
  observation:
    'Génère une OBSERVATION SÉRIEUSE. Structure : fait concret + chiffre choc + question rhétorique.',
  alien:
    "Génère un post L'ALIEN NE COMPREND PAS. Décris un comportement humain banal avec un regard littéral et naïf. Comédie.",
  rapport:
    'Génère un RAPPORT DE MISSION. Compte rendu factuel et légèrement absurde adressé à ta "base".',
  experience:
    "Génère une EXPÉRIENCE SOCIALE. Pose une question engageante à l'audience.",
};

export async function generateScript(
  type: PostType,
  topic?: string
): Promise<AionScript> {
  const userPrompt = [
    typeInstructions[type],
    topic ? `Sujet : ${topic}` : 'Choisis un sujet pertinent du moment.',
    '',
    'Réponds en JSON strict :',
    '{',
    '  "title": "titre court pour référence interne",',
    '  "script": "le texte exact à lire à voix haute",',
    `  "type": "${type}",`,
    '  "hashtags": ["#aion", "#ia", "...3 à 5 hashtags pertinents"],',
    '  "keywords": ["mot-clé 1 en anglais pour recherche photo", "mot-clé 2", "...3 à 5 mots-clés visuels en anglais"]',
    '}',
  ].join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Réponse inattendue de Claude API');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Pas de JSON trouvé dans la réponse');
  }

  return JSON.parse(jsonMatch[0]) as AionScript;
}

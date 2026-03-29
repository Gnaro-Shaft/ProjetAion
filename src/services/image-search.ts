import fs from 'fs';
import path from 'path';

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    portrait: string;
  };
  alt: string;
}

export interface DownloadedImage {
  filePath: string;
  alt: string;
}

export async function searchAndDownloadImages(
  keywords: string[],
  outputDir: string,
  count: number = 5
): Promise<DownloadedImage[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY non définie dans .env');
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const images: DownloadedImage[] = [];
  const usedIds = new Set<number>();

  // Chercher des images pour chaque mot-clé
  for (const keyword of keywords) {
    if (images.length >= count) break;

    const url = `${PEXELS_API_URL}?query=${encodeURIComponent(keyword)}&per_page=3&orientation=portrait`;

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      console.warn(`Pexels: erreur pour "${keyword}" (${response.status})`);
      continue;
    }

    const data = await response.json() as { photos: PexelsPhoto[] };

    for (const photo of data.photos) {
      if (images.length >= count) break;
      if (usedIds.has(photo.id)) continue;
      usedIds.add(photo.id);

      // Télécharger l'image en portrait (format TikTok)
      const imageUrl = photo.src.portrait || photo.src.large;
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) continue;

      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      const fileName = `img-${photo.id}.jpg`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, buffer);

      images.push({ filePath, alt: photo.alt || keyword });
    }
  }

  return images;
}

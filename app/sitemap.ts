import type { MetadataRoute } from 'next'
import { PRESET_CITIES } from '../src/api'

const BASE = 'https://czytorekord.vercel.app'
// representative dates (one per season) so each city gets indexable day-pages
const SEASONAL = ['01-15', '04-15', '07-15', '10-15']

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/o-projekcie`, changeFrequency: 'monthly', priority: 0.5 },
  ]
  for (const c of PRESET_CITIES) {
    for (const d of SEASONAL) {
      entries.push({
        url: `${BASE}/${c.slug}/${d}`,
        changeFrequency: 'yearly',
        priority: 0.6,
      })
    }
  }
  return entries
}

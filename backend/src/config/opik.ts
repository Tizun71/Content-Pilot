import { Opik } from 'opik';

export const opikClient = new Opik({
  apiKey: process.env.OPIK_API_KEY,
  projectName: 'content-pilot',
});

export const EVALUATORS = {
  CONTENT_QUALITY: 'content-quality',
  ENGAGEMENT_POTENTIAL: 'engagement-potential',
  IMAGE_TEXT_ALIGNMENT: 'image-text-alignment',
  PLATFORM_FIT: 'platform-fit',
  TONE_CONSISTENCY: 'tone-consistency'
};
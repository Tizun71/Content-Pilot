import { Router, Request, Response } from 'express';
import * as geminiService from '../services/gemini';

const router = Router();

router.post('/plan-workflow', async (req: Request, res: Response) => {
  try {
    const { intent } = req.body;

    if (!intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }

    const result = await geminiService.planWorkflow(intent);
    res.json(result);
  } catch (error: any) {
    console.error('Error in plan-workflow:', error);
    res.status(500).json({ 
      error: 'Failed to plan workflow',
      message: error.message 
    });
  }
});

router.post('/scan-topic', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const result = await geminiService.scanTopic(topic);
    res.json(result);
  } catch (error: any) {
    console.error('Error in scan-topic:', error);
    res.status(500).json({ 
      error: 'Failed to scan topic',
      message: error.message 
    });
  }
});


router.post('/generate-post', async (req: Request, res: Response) => {
  try {
    const { context, tone, platform, language, length, imageBase64 } = req.body;

    if (!context || !tone || !platform || !language || !length) {
      return res.status(400).json({ 
        error: 'Missing required fields: context, tone, platform, language, length' 
      });
    }

    const result = await geminiService.generatePost(
      context,
      tone,
      platform,
      language,
      length,
      imageBase64
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Error in generate-post:', error);
    res.status(500).json({ 
      error: 'Failed to generate post',
      message: error.message 
    });
  }
});

router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, referenceImage, count = 1, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const images = await geminiService.generateImage(
      prompt,
      referenceImage,
      count,
      style
    );
    
    res.json({ images });
  } catch (error: any) {
    console.error('Error in generate-image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      message: error.message 
    });
  }
});

export default router;

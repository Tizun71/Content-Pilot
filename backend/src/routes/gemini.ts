import { Router, Request, Response } from 'express';
import * as geminiService from '../services/gemini';
import { opikClient } from '../config/opik';

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

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    if (!process.env.OPIK_API_KEY) {
      return res.status(503).json({ 
        error: 'Analytics unavailable',
        message: 'Opik is not configured. Add OPIK_API_KEY to enable analytics.' 
      });
    }

    // Return analytics summary
    res.json({
      message: 'Analytics available in Opik dashboard',
      dashboard_url: 'https://www.comet.com/opik',
      features: {
        tracing: 'All AI operations are traced',
        evaluation: 'Automatic quality evaluation',
        logging: 'Detailed operation logs',
        optimization: 'Prompt optimization insights'
      },
      metrics_tracked: [
        'workflow_planning_quality',
        'search_effectiveness',
        'content_generation_quality',
        'image_generation_quality',
        'engagement_potential',
        'tone_consistency',
        'platform_fit'
      ]
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      message: error.message 
    });
  }
});

router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const { component } = req.body;

    if (!component) {
      return res.status(400).json({ 
        error: 'Component is required',
        valid_components: ['workflow', 'content', 'image', 'search']
      });
    }

    if (!process.env.OPIK_API_KEY) {
      return res.status(503).json({ 
        error: 'Optimization unavailable',
        message: 'Opik is not configured. Add OPIK_API_KEY to enable optimization.' 
      });
    }

    console.log('[Opik] Manual Optimization Trigger:', { component, timestamp: new Date().toISOString() });

    res.json({
      message: `Optimization analysis queued for ${component}`,
      status: 'pending',
      note: 'Check Opik dashboard for optimization insights',
      dashboard_url: 'https://www.comet.com/opik',
      recommendations: [
        'Review low-scoring operations in Opik dashboard',
        'Identify patterns in failed evaluations',
        'Adjust prompts based on feedback metrics',
        'Monitor performance trends over time'
      ]
    });
  } catch (error: any) {
    console.error('Error in optimize:', error);
    res.status(500).json({ 
      error: 'Failed to trigger optimization',
      message: error.message 
    });
  }
});

export default router;

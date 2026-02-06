import { Opik } from 'opik';

export const opikClient = new Opik({
  apiKey: process.env.OPIK_API_KEY,
  apiUrl: "https://www.comet.com/opik/api",
  projectName: 'content-pilot',
  workspaceName: "tizun71",
});

export const EVALUATORS = {
  CONTENT_QUALITY: 'content-quality',
  ENGAGEMENT_POTENTIAL: 'engagement-potential',
  IMAGE_TEXT_ALIGNMENT: 'image-text-alignment',
  PLATFORM_FIT: 'platform-fit',
  TONE_CONSISTENCY: 'tone-consistency',
  WORKFLOW_QUALITY: 'workflow-quality',
  SEARCH_EFFECTIVENESS: 'search-effectiveness'
};

export const PROMPT_TEMPLATES = {
  WORKFLOW_ORCHESTRATOR: 'workflow_orchestrator_v1',
  CONTENT_GENERATOR: 'content_generator_v1',
  IMAGE_PROMPT_GENERATOR: 'image_prompt_generator_v1',
  SEARCH_QUERY: 'search_query_v1'
};

export async function optimizePrompt(
  promptName: string,
  currentPrompt: string,
  feedback: Array<{ score: number; metadata: any }>
): Promise<string> {
  if (!process.env.OPIK_API_KEY) {
    console.log('Opik not configured, skipping prompt optimization');
    return currentPrompt;
  }

  try {
    const avgScore = feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length;
    
    console.log('[Opik] Prompt Optimization Attempt:', {
      prompt_name: promptName,
      current_score: avgScore,
      feedback_count: feedback.length
    });

    if (avgScore >= 8) {
      console.log(`Prompt ${promptName} performing well (score: ${avgScore}), no optimization needed`);
      return currentPrompt;
    }

    const issues = feedback
      .filter(f => f.score < 7)
      .map(f => f.metadata)
      .flat();

    console.log(`Optimizing prompt ${promptName} based on ${issues.length} low-score instances`);
    
    console.log('[Opik] Prompt Optimization Result:', {
      prompt_name: promptName,
      issues_analyzed: issues.length,
      optimization_applied: false,
      avg_score: avgScore
    });

    return currentPrompt; 
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    return currentPrompt;
  }
}
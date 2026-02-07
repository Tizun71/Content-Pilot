import { GoogleGenAI, Type } from "@google/genai";
import { opikClient } from '../config/opik.js';

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface CrawlResult {
  summary: string;
  sources: Array<{ title: string; uri: string }>;
  rawText: string;
}

interface GeneratedPost {
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export const planWorkflow = async (intent: string): Promise<any> => {
  const ai = getAiClient();
  
  const trace = opikClient.trace({
    name: 'plan_workflow',
    input: { intent },
    metadata: {
      module: 'ORCHESTRATOR',
      model: 'gemini-3-flash-preview'
    }
  });

  const prompt = `
    You are an AI Workflow Orchestrator for a STARTUP ORGANIC MARKETING tool.
    This tool helps startups create authentic social media content to grow their audience organically.
    
    User Intent: "${intent}"
    
    Available Modules:
    - SEARCH: Research trending topics, competitor content, and audience interests
    - WRITE: Generate authentic social media content with startup-friendly tones
    - IMAGE: Create compelling visuals (product shots, team photos, infographics)
    - PREVIEW: Preview how the post will look on social media
    - PUBLISHER: Auto-publish to connected social media accounts
    
    Your Task:
    1. Analyze the startup's intent and decide which modules to enable
    2. Configure WRITE module for organic marketing:
       - tone: Choose from:
         * "Problem-Solution" - address pain points, offer solution
         * "Founder Story" - authentic journey, why they built this
         * "Customer Success" - real results and testimonials
         * "Educational / How-to" - teach and build authority
         * "Behind-the-Scenes" - show process and team culture
         * "Thought Leadership" - share insights and hot takes
         * "Community-First" - celebrate users, start conversations
         * "Product Updates" - feature launches and improvements
       - language: target language (e.g., "English", "Vietnamese")
       - length: "Short (1-2 sentences)", "Medium (3-5 sentences)", or "Long (6+ sentences)"
    
    3. Configure IMAGE module for startup visuals:
       - style: Choose from:
         * "Product in Action" - real usage, demo style
         * "Founder/Team Spotlight" - authentic people, workspace
         * "Customer Story" - real users, testimonials
         * "Behind-the-Scenes" - process, development
         * "Problem-Solution Visual" - before/after comparison
         * "Minimal Product Focus" - clean hero shot
         * "UGC Style" - user-generated feel
         * "Data/Results Driven" - metrics, growth charts
       - count: number of image variations (1-4)
    
    Return JSON with:
    - modules: array of module names to enable (e.g., ["SEARCH", "WRITE", "IMAGE", "PREVIEW"])
    - config: { writer: { tone, language, length }, image: { style, count } }
  `;

  try {
    const startTime = Date.now();
    
    console.log('[Opik] Plan Workflow - Prompt:', prompt.substring(0, 100) + '...');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: workflowPlanSchema
      },
    });

    const result = JSON.parse(response.text || '{}');
    
    const latency = Date.now() - startTime;
    
    console.log('[Opik] Plan Workflow - Result:', {
      latency_ms: latency,
      token_usage: response.usageMetadata,
      modules_count: result.modules?.length || 0
    });
    
    // Evaluate workflow quality
    const evaluationScore = await evaluateWorkflowQuality(intent, result);
    console.log('[Opik] Workflow Planning Quality Score:', evaluationScore);
    
    trace.end();

    return result;
  } catch (error: any) {
    trace.end();
    throw error;
  }
};

export const scanTopic = async (topic: string): Promise<CrawlResult> => {
  const ai = getAiClient();
  
  const trace = opikClient.trace({
    name: 'scan_topic',
    input: { topic },
    metadata: { module: 'SEARCH', model: 'gemini-3-flash-preview' }
  });

  const prompt = `Research for startup organic marketing campaign about: "${topic}"

Return a CONCISE summary in bullet points (2-3 bullets per section):

**Trending Topics:**
- [Key trend 1]
- [Key trend 2]

**Audience Pain Points:**
- [Pain point 1]
- [Pain point 2]

**Content Opportunities:**
- [Opportunity 1]
- [Opportunity 2]

Keep it brief, actionable, and focused. Max 150 words total.`;

  try {
    const startTime = Date.now();
    
    console.log('[Opik] Scan Topic - Query:', { topic, module: 'SEARCH' });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const result: CrawlResult = {
      summary: response.text || "",
      sources: extractSources(response),
      rawText: response.text || ""
    };
    
    const latency = Date.now() - startTime;
    
    console.log('[Opik] Search Results:', {
      summary_length: result.summary.length,
      sources_count: result.sources.length,
      latency_ms: latency,
      has_grounding: result.sources.length > 0
    });

    const searchQualityScore = await evaluateSearchQuality(topic, result, trace);
    
    console.log('[Opik] Search Effectiveness Score:', searchQualityScore, {
      topic,
      sources_found: result.sources.length
    });

    trace.end();

    return result;
  } catch (error: any) {
    trace.end();
    throw error;
  }
};

export const generatePost = async (
  context: string, 
  tone: string, 
  platform: string, 
  language: string, 
  length: string, 
  imageBase64?: string
): Promise<GeneratedPost> => {
  const ai = getAiClient();
  
  const trace = opikClient.trace({
    name: 'generate_post',
    input: { context, tone, platform, language, length, hasImage: !!imageBase64 },
    metadata: { 
      module: 'WRITE',
      model: 'gemini-3-flash-preview'
    }
  });

  const prompt = buildContentPrompt(context, tone, platform, language, length);

  try {
    const startTime = Date.now();
    
    console.log('[Opik] Content Generation - Params:', {
      context_preview: context.substring(0, 100),
      tone,
      platform,
      language,
      length,
      has_image: !!imageBase64
    });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: imageBase64 
        ? [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }]
        : prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: postSchema
      }
    });

    const result: GeneratedPost = JSON.parse(response.text || '{}');
    
    const latency = Date.now() - startTime;
    
    console.log('[Opik] Generated Content:', {
      content_length: result.content.length,
      hashtags_count: result.hashtags.length,
      latency_ms: latency,
      platform,
      tone
    });

    const evaluationResults = await evaluateContentQuality(
      trace,
      context,
      result,
      { tone, platform, language }
    );
    
    console.log('[Opik] Content Quality Evaluation:', {
      overall_score: evaluationResults.overall_score,
      engagement: evaluationResults.engagement_score,
      clarity: evaluationResults.clarity_score,
      tone_match: evaluationResults.tone_score,
      platform_fit: evaluationResults.platform_score,
      red_flags: evaluationResults.red_flags_count
    });

    trace.end();

    return result;
  } catch (error: any) {
    trace.end();
    throw error;
  }
};

export const generateImage = async (
  prompt: string,
  referenceImage?: string,
  count: number = 1,
  style?: string
): Promise<string[]> => {
  const ai = getAiClient();
  
  const trace = opikClient.trace({
    name: 'generate_image',
    input: { prompt, hasReference: !!referenceImage, count, style },
    metadata: { module: 'IMAGE', model: 'imagen-4.0-generate-001' }
  });

  try {
    const startTime = Date.now();
    
    // Enhanced prompt for startup organic marketing visuals
    const styleGuidance = style || 'Product in Action';
    const fullPrompt = `${prompt}

Style: ${styleGuidance}

Guidelines for startup organic marketing visuals:
- Authentic and real, not stock photo aesthetic
- Relatable and human-centric
- Clear value proposition shown visually
- Social media optimized (attention-grabbing)
- Professional but approachable
- Avoid corporate/stuffy vibes`;
    
    // Log image generation request
    console.log('[Opik] Image Generation - Request:', {
      prompt: prompt.substring(0, 200),
      style,
      count,
      has_reference: !!referenceImage
    });
    
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: { numberOfImages: count }
    });

    const images = response.generatedImages?.map(img => img.image?.imageBytes).filter((img): img is string => img !== undefined) || [];
    
    const latency = Date.now() - startTime;
    
    // Log image generation results
    console.log('[Opik] Generated Images:', {
      images_count: images.length,
      requested_count: count,
      success_rate: images.length / count,
      latency_ms: latency,
      style
    });

    if (images.length > 0) {
      const alignmentScore = await evaluateImageTextAlignment(trace, prompt, images[0]);
      
      // Log image quality evaluation
      console.log('[Opik] Image Quality Score:', alignmentScore, {
        prompt_preview: prompt.substring(0, 100),
        style,
        images_generated: images.length
      });
    }
    
    trace.end();
    return images;
  } catch (error: any) {
    trace.end();
    throw error;
  }
};

async function evaluateWorkflowQuality(
  intent: string,
  workflowPlan: any
): Promise<number> {
  const ai = getAiClient();
  
  const evalPrompt = `
    You are evaluating a workflow plan for a STARTUP's ORGANIC MARKETING campaign.
    The workflow should help create authentic content that grows audience organically.
    
    User Intent: "${intent}"
    Workflow Plan: ${JSON.stringify(workflowPlan)}
    
    Rate the workflow quality on these criteria (1-10 each):
    1. Intent Understanding: Does it correctly interpret what the startup wants to achieve?
    2. Module Selection: Right mix of research, content creation, and distribution?
    3. Strategy Fit: Are the tone and visual style appropriate for organic growth?
    4. Audience Value: Will this workflow create content that audiences actually want?
    5. Efficiency: Is the workflow streamlined without unnecessary steps?
    
    Return JSON: { intent_understanding: number, module_selection: number, strategy_fit: number, audience_value: number, efficiency: number, overall: number, reasoning: string }
  `;
  
  try {
    const evalResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: evalPrompt,
      config: { responseMimeType: "application/json" }
    });
    
    const evalResult = JSON.parse(evalResponse.text || '{}');
    
    // Log evaluation result
    console.log('[Opik] Workflow Quality Evaluation:', evalResult);
    
    return evalResult.overall || 5;
  } catch (error) {
    console.error('Workflow evaluation error:', error);
    return 5; // Default neutral score
  }
}

async function evaluateSearchQuality(
  topic: string, 
  result: CrawlResult, 
  trace: any
): Promise<number> {
  const ai = getAiClient();
  
  const evalSpan = trace.span({
    name: 'eval_search_quality',
    input: { topic, summary: result.summary }
  });

  const evalPrompt = `
    You are evaluating search quality for a STARTUP's ORGANIC MARKETING research.
    The search should provide actionable insights for creating authentic, valuable content.
    
    Original Topic: "${topic}"
    Search Summary: "${result.summary}"
    Sources Found: ${result.sources.length}
    
    Rate the search quality on these criteria (1-10 each):
    1. Relevance: How relevant is this for startup organic marketing?
    2. Trend Awareness: Does it capture current trends and conversations?
    3. Content Opportunities: Are there clear gaps or angles a startup can leverage?
    4. Actionability: Can this directly inform authentic content creation?
    5. Competitive Insight: Does it reveal what's working in the space?
    
    Return JSON: { relevance: number, trend_awareness: number, opportunities: number, actionability: number, competitive_insight: number, overall: number, reasoning: string }
  `;

  try {
    const evalResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: evalPrompt,
      config: { responseMimeType: "application/json" }
    });

    const evalResult = JSON.parse(evalResponse.text || '{}');
    
    evalSpan.end({ output: evalResult });
    
    // Log as Opik feedback
    trace.logFeedback({
      name: 'search_quality',
      value: evalResult.overall,
      categoryName: 'SEARCH_EVALUATION',
      comment: evalResult.reasoning
    });

    return evalResult.overall;
  } catch (error) {
    evalSpan.end({ output: null, error: (error as Error).message });
    return 0;
  }
}

async function evaluateContentQuality(
  trace: any,
  context: string,
  content: GeneratedPost,
  config: { tone: string; platform: string; language: string }
): Promise<Record<string, number>> {
  const ai = getAiClient();
  
  const evalSpan = trace.span({
    name: 'eval_content_quality',
    input: { context, content, config }
  });

  const evalPrompt = `
    You are evaluating social media content for a STARTUP's ORGANIC MARKETING campaign.
    Content must feel authentic, provide value, and avoid being overly promotional.
    
    Original Context: "${context}"
    Generated Content: "${content.content}"
    Hashtags: ${JSON.stringify(content.hashtags)}
    Target Platform: ${config.platform}
    Content Strategy: ${config.tone}
    Target Language: ${config.language}
    
    Evaluate on these dimensions (1-10 each):
    
    1. **Organic Reach Potential**: Will this get shared/engaged naturally without ads?
    2. **Authenticity**: Does it sound human and genuine, not corporate/salesy?
    3. **Value to Audience**: Does it provide real value (education, entertainment, inspiration)?
    4. **Strategy Alignment**: Does it match the requested strategy (${config.tone})?
    5. **Platform Optimization**: Is it optimized for ${config.platform} organic algorithm?
    6. **Conversation Starter**: Does it encourage meaningful engagement and discussion?
    7. **Brand Building**: Does it build trust and connection vs just pushing product?
    
    Also check for RED FLAGS for organic marketing:
    - Too promotional/salesy (reduces organic reach)
    - Generic/boring (won't get engagement)
    - Clickbait without value
    - Misinformation or misleading claims
    - Grammar/spelling errors
    - Overuse of hashtags (looks spammy)
    
    Return JSON:
    {
      "engagement_potential": number,
      "clarity": number,
      "tone_consistency": number,
      "platform_fit": number,
      "hashtag_quality": number,
      "cta_effectiveness": number,
      "originality": number,
      "overall_score": number,
      "red_flags": string[],
      "improvement_suggestions": string[],
      "reasoning": string
    }
  `;

  try {
    const evalResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: evalPrompt,
      config: { responseMimeType: "application/json" }
    });

    const evalResult = JSON.parse(evalResponse.text || '{}');
    
    evalSpan.end({ output: evalResult });

    // Log multiple feedback dimensions to Opik
    const feedbackMetrics = [
      { name: 'engagement_potential', value: evalResult.engagement_potential },
      { name: 'clarity', value: evalResult.clarity },
      { name: 'tone_consistency', value: evalResult.tone_consistency },
      { name: 'platform_fit', value: evalResult.platform_fit },
      { name: 'hashtag_quality', value: evalResult.hashtag_quality },
      { name: 'overall_content_score', value: evalResult.overall_score }
    ];

    for (const metric of feedbackMetrics) {
      trace.logFeedback({
        name: metric.name,
        value: metric.value,
        categoryName: 'CONTENT_EVALUATION'
      });
    }

    // Log red flags
    if (evalResult.red_flags?.length > 0) {
      trace.logFeedback({
        name: 'red_flags_detected',
        value: evalResult.red_flags.length,
        categoryName: 'SAFETY',
        comment: evalResult.red_flags.join(', ')
      });
    }

    return {
      engagement_score: evalResult.engagement_potential,
      clarity_score: evalResult.clarity,
      tone_score: evalResult.tone_consistency,
      platform_score: evalResult.platform_fit,
      overall_score: evalResult.overall_score,
      red_flags_count: evalResult.red_flags?.length || 0
    };
  } catch (error) {
    evalSpan.end({ output: null, error: (error as Error).message });
    return {
      engagement_score: 0,
      clarity_score: 0,
      tone_score: 0,
      platform_score: 0,
      overall_score: 0,
      red_flags_count: 0
    };
  }
}

async function evaluateImageTextAlignment(
  trace: any,
  prompt: string,
  imageBase64: string
): Promise<number> {
  const ai = getAiClient();
  
  const evalSpan = trace.span({
    name: 'eval_image_text_alignment',
    input: { prompt }
  });

  const evalPrompt = `
    You are evaluating how well a generated image matches its prompt.
    
    Original Prompt: "${prompt}"
    
    Analyze the provided image and rate:
    1. **Semantic Match (1-10)**: Does the image represent the prompt's meaning?
    2. **Style Accuracy (1-10)**: Does the style match what was requested?
    3. **Visual Quality (1-10)**: Is the image clear, professional, and usable?
    4. **Social Media Ready (1-10)**: Would this work well for social media posts?
    
    Return JSON: { semantic: number, style: number, quality: number, social_ready: number, overall: number, issues: string[] }
  `;

  try {
    const evalResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: evalPrompt },
        { inlineData: { mimeType: 'image/png', data: imageBase64 } }
      ],
      config: { responseMimeType: "application/json" }
    });

    const evalResult = JSON.parse(evalResponse.text || '{}');
    
    evalSpan.end({ output: evalResult });
    
    trace.logFeedback({
      name: 'image_text_alignment',
      value: evalResult.overall,
      categoryName: 'IMAGE_EVALUATION',
      comment: evalResult.issues?.join(', ')
    });

    return evalResult.overall;
  } catch (error) {
    evalSpan.end({ output: null, error: (error as Error).message });
    return 0;
  }
}

function extractSources(response: any): Array<{ title: string; uri: string }> {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks.map((chunk: any) => ({
    title: chunk.web?.title || '',
    uri: chunk.web?.uri || ''
  })).filter((s: any) => s.uri);
}

function buildContentPrompt(context: string, tone: string, platform: string, language: string, length: string): string {
  const toneMap: Record<string, string> = {
    "Problem-Solution": "Identify a specific pain point your audience faces, then present your product/service as the solution. Be empathetic and results-focused.",
    "Founder Story": "Share authentic founder journey, challenges overcome, why you built this, and lessons learned. Be vulnerable and human.",
    "Customer Success": "Highlight real customer results, testimonials, transformation stories. Use specific metrics and genuine quotes when possible.",
    "Educational / How-to": "Teach your audience something valuable related to your industry. Build authority and trust through helpful content.",
    "Behind-the-Scenes": "Show the real work, team culture, product development process. Give exclusive peek into how things are made.",
    "Thought Leadership": "Share unique insights, industry trends, or hot takes. Position as an expert with a distinct point of view.",
    "Community-First": "Celebrate your users, ask questions, start meaningful conversations. Make it about them, not you.",
    "Product Updates": "Announce new features, improvements, or roadmap teasers. Focus on benefits and value to users."
  };

  return `
    You are creating organic social media content for a STARTUP trying to grow through authentic marketing.
    
    Context: ${context}
    Platform: ${platform} 
    Language: ${language}
    Content Strategy: ${toneMap[tone] || tone}
    Target Length: ${length}
    
    Guidelines for startup organic marketing:
    - Be authentic and human, not corporate or salesy
    - Focus on value to the audience, not just promoting
    - Use conversational language that builds connection
    - Include specific details, examples, or data when relevant
    - Make it shareable and engaging
    - Avoid marketing buzzwords and corporate jargon
    
    Return JSON with: 
    - content: the ${platform} post text (optimized for organic reach)
    - hashtags: 3-5 relevant, non-generic hashtags
    - imagePrompt: detailed description for generating a compelling visual that supports the message
  `;
}

const workflowPlanSchema = {
  type: Type.OBJECT,
  properties: {
    modules: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of module names to enable (SEARCH, WRITE, IMAGE, PREVIEW, PUBLISHER)"
    },
    config: {
      type: Type.OBJECT,
      properties: {
        writer: {
          type: Type.OBJECT,
          properties: {
            tone: { type: Type.STRING },
            language: { type: Type.STRING },
            length: { type: Type.STRING }
          }
        },
        image: {
          type: Type.OBJECT,
          properties: {
            style: { type: Type.STRING },
            count: { type: Type.NUMBER }
          }
        }
      }
    }
  },
  required: ["modules", "config"]
};

const postSchema = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.STRING },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
    imagePrompt: { type: Type.STRING }
  },
  required: ["content", "hashtags", "imagePrompt"]
};

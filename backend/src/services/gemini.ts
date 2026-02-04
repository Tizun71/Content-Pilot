import { GoogleGenAI, Type } from "@google/genai";
import { opikClient } from '../config/opik';

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
      model: 'gemini-2.5-flash'
    }
  });

  const prompt = `
    You are an AI Workflow Orchestrator.
    User Intent: "${intent}"
    
    Task:
    1. Decide which modules to enable (SEARCH, WRITE, IMAGE, PREVIEW, PUBLISHER).
    2. Configure the WRITE module parameters based on the intent.
    3. Configure the IMAGE module parameters based on the intent.
    
    Return JSON with the workflow plan.
  `;

  try {
    const startTime = Date.now();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      },
    });

    const result = JSON.parse(response.text || '{}');
    
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
    metadata: { module: 'SEARCH', model: 'gemini-2.5-flash' }
  });

  const prompt = `Search for the latest viral discussions about: "${topic}"`;

  try {
    const startTime = Date.now();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const result: CrawlResult = {
      summary: response.text || "",
      sources: extractSources(response),
      rawText: response.text || ""
    };

    const searchQualityScore = await evaluateSearchQuality(topic, result, trace);

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
      model: 'gemini-2.5-flash'
    }
  });

  const prompt = buildContentPrompt(context, tone, platform, language, length);

  try {
    const startTime = Date.now();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: imageBase64 
        ? [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }]
        : prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: postSchema
      }
    });

    const result: GeneratedPost = JSON.parse(response.text || '{}');

    const evaluationResults = await evaluateContentQuality(
      trace,
      context,
      result,
      { tone, platform, language }
    );

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
    metadata: { module: 'IMAGE', model: 'imagen-3.0-generate-002' }
  });

  try {
    const startTime = Date.now();
    
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: `${prompt}. Style: ${style || 'Minimal & Clean'}`,
      config: { numberOfImages: count }
    });

    const images = response.generatedImages?.map(img => img.image?.imageBytes).filter((img): img is string => img !== undefined) || [];

    if (images.length > 0) {
      const alignmentScore = await evaluateImageTextAlignment(trace, prompt, images[0]);
    }
    
    trace.end();
    return images;
  } catch (error: any) {
    trace.end();
    throw error;
  }
};

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
    You are evaluating the quality of a search result for content creation.
    
    Original Topic: "${topic}"
    Search Summary: "${result.summary}"
    Sources Found: ${result.sources.length}
    
    Rate the search quality on these criteria (1-10 each):
    1. Relevance: How relevant is the summary to the topic?
    2. Freshness: Does it seem to include recent/trending information?
    3. Depth: Is there enough context for content creation?
    4. Actionability: Can a content creator use this effectively?
    
    Return JSON: { relevance: number, freshness: number, depth: number, actionability: number, overall: number, reasoning: string }
  `;

  try {
    const evalResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    You are a social media content quality evaluator.
    
    Original Context: "${context}"
    Generated Content: "${content.content}"
    Hashtags: ${JSON.stringify(content.hashtags)}
    Target Platform: ${config.platform}
    Target Tone: ${config.tone}
    Target Language: ${config.language}
    
    Evaluate on these dimensions (1-10 each):
    
    1. **Engagement Potential**: Will this content drive likes, comments, shares?
    2. **Clarity**: Is the message clear and easy to understand?
    3. **Tone Consistency**: Does it match the requested tone (${config.tone})?
    4. **Platform Fit**: Is it optimized for ${config.platform}? (character limits, style)
    5. **Hashtag Quality**: Are hashtags relevant and effective?
    6. **CTA Effectiveness**: Does it encourage action from readers?
    7. **Originality**: Is the content unique and not generic?
    
    Also check for RED FLAGS:
    - Contains misinformation
    - Potentially offensive content
    - Spam-like patterns
    - Grammar/spelling errors
    
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
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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
    "Storytelling": "Focus on storytelling: narrate a brand story or customer experience.",
    "Educational / How-to": "Educational content: provide guides, share knowledge.",
    "Conversational / Casual": "Conversational tone: friendly, like a chat.",
    "Professional / Formal": "Professional and formal tone.",
    "Humorous / Entertaining": "Funny and entertaining content.",
    "Inspirational / Motivational": "Inspirational and motivating messages."
  };

  return `
    Create a ${platform} post in ${language}.
    Context: ${context}
    Tone: ${toneMap[tone] || tone}
    Length: ${length}
    
    Return JSON with: content (the post text), hashtags (array of relevant hashtags), imagePrompt (description for image generation)
  `;
}

const postSchema = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.STRING },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
    imagePrompt: { type: Type.STRING }
  },
  required: ["content", "hashtags", "imagePrompt"]
};

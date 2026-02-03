import { GoogleGenAI, Type } from "@google/genai";
import { CrawlResult, GeneratedPost } from "../types";

// Helper to ensure fresh client with potentially updated key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip data:image/png;base64, prefix if present
const cleanBase64 = (data: string) => {
  if (data.includes(',')) {
    return data.split(',')[1];
  }
  return data;
};

// --- ORCHESTRATION AGENT ---
export const planWorkflow = async (intent: string): Promise<any> => {
  const ai = getAiClient();
  
  const prompt = `
    You are an AI Workflow Orchestrator.
    User Intent: "${intent}"
    
    Task:
    1. Decide which modules to enable (SEARCH, WRITE, IMAGE, PREVIEW, PUBLISHER).
    2. Configure the WRITE module parameters based on the intent.
    3. Configure the IMAGE module parameters based on the intent.

    Definitions:
    - SEARCH: Enable if user needs external info, news, research, or trending topics.
    - WRITE: Enable for text generation.
    - IMAGE: Enable for visual generation.
    - PREVIEW: Always include if WRITE or IMAGE is used.
    - PUBLISHER: Use ONLY if the user explicitly asks to "publish" or "post" immediately.

    Configuration Constraints:
    - writer.tone: "Storytelling", "Educational / How-to", "Listicle", "Conversational / Casual", "Data-driven", "Problem-Solution", "Trend / Newsjacking"
    - writer.platform: "Twitter" (ONLY). Do not use Instagram.
    - writer.length: "Short", "Medium", "Long"
    - writer.language: "Vietnamese", "English", "Spanish", "French", "German", "Japanese", "Korean", "Chinese" (Detect language from intent, default Vietnamese)
    - image.style: "Minimal & Clean", "UGC style", "Real people, real emotion", "Soft editorial", "Documentary / Behind-the-scenes", "Process-focused", "Data + human", "Trust-first organic" (Pick the best match)
    - image.count: 1 to 4 (Default 1 for free tier)

    Input and Output are mandatory, do not list them in 'modules'.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // ✅ GEMINI 2.5 FLASH
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modules: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            config: {
              type: Type.OBJECT,
              properties: {
                writer: {
                  type: Type.OBJECT,
                  properties: {
                    tone: { type: Type.STRING },
                    platform: { type: Type.STRING },
                    length: { type: Type.STRING },
                    language: { type: Type.STRING }
                  }
                },
                image: {
                  type: Type.OBJECT,
                  properties: {
                    style: { type: Type.STRING },
                    count: { type: Type.INTEGER }
                  }
                }
              }
            }
          },
          required: ["modules", "config"]
        }
      },
    });

    const jsonText = response.text;
    if (!jsonText) return { modules: [], config: {} };
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Orchestration failed:", error);
    // Fallback default plan
    return { 
      modules: ["WRITE", "PREVIEW"], 
      config: { 
        writer: { tone: "Conversational / Casual", language: "Vietnamese", platform: "Twitter" },
        image: { count: 1 } // Lower count for free tier fallback
      } 
    };
  }
};

export const scanTopic = async (topic: string): Promise<CrawlResult> => {
  const ai = getAiClient();
  
  const prompt = `
    Search for the latest viral discussions, news, and key sentiments regarding: "${topic}".
    Summarize findings into a concise briefing.
  `;

  try {
    // Attempt with Google Search Grounding first
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // ✅ GEMINI 2.5 FLASH
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // May not work on free tier, will fallback
      },
    });

    const summary = response.text || "No summary generated.";
    
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri,
        });
      }
    });

    // Remove duplicates based on URI
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

    return {
      summary,
      sources: uniqueSources,
      rawText: summary,
    };
  } catch (error: any) {
    console.warn("Search Grounding failed (likely Free Tier limitation), falling back to internal knowledge:", error.message);
    
    // Fallback: Generate without search tool if quota exceeded or not available
    try {
      const fallbackPrompt = `
        Provide a detailed summary and analysis of the topic: "${topic}".
        Since real-time search is unavailable, use your internal knowledge base to provide general insights, context, and potential angles for social media content.
        State clearly that this is based on general knowledge.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fallbackPrompt,
      });

      return {
        summary: response.text || "Generated based on internal knowledge.",
        sources: [], // No sources available in fallback
        rawText: response.text || "",
      };
    } catch (fallbackError) {
      throw new Error("Failed to scan topic even with fallback.");
    }
  }
};

export const generatePost = async (context: string, tone: string, platform: string, language: string, length: string, imageBase64?: string): Promise<GeneratedPost> => {
  const ai = getAiClient();

  const styleMap: Record<string, string> = {
    "Storytelling": "Focus on storytelling: narrate a brand story or customer experience.",
    "Educational / How-to": "Educational content: provide guides, share knowledge, and practical tips.",
    "Listicle": "Listicle format: short, concise list, easy to read and share.",
    "Conversational / Casual": "Conversational tone: friendly, like a chat, to increase interaction.",
    "Data-driven": "Data-driven: use figures, reports, and case studies to increase credibility.",
    "Problem-Solution": "Problem-Solution structure: state the problem first, then provide the solution.",
    "Trend / Newsjacking": "Trend/Newsjacking: leverage current trends or hot events to go viral."
  };

  const styleInstruction = styleMap[tone] || tone;

  // Enforce Twitter instructions regardless of passed platform parameter to be safe
  const platformInstructions = "Write a viral X (Twitter) post. Keep it concise (under 280 chars unless a thread). Focus on punchy, shareable hooks.";

  const prompt = `
    Act as a social media manager.
    Context/Topic: "${context}"
    ${imageBase64 ? 'Also analyze the provided image to ensure the post content and especially the image prompt are highly relevant to the visual provided.' : ''}
    
    Task: ${platformInstructions}
    Writing Style: ${styleInstruction}
    Length: ${length}
    Output Language: ${language}
    
    Return JSON:
    {
      "content": "the main post text excluding hashtags",
      "hashtags": ["list of 3-5 relevant hashtags"],
      "imagePrompt": "visual description for AI image generator. If an image was provided, describe a variation of it."
    }
  `;

  try {
    const parts: any[] = [{ text: prompt }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64(imageBase64)
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING }
          },
          required: ["content", "hashtags", "imagePrompt"]
        }
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned");
    
    const result = JSON.parse(jsonText);
    
    const formattedHashtags = result.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    const fullContent = `${result.content}\n\n${formattedHashtags}`;

    return {
      ...result,
      content: fullContent
    } as GeneratedPost;
    
  } catch (error) {
    console.error("Generation failed:", error);
    throw new Error("Failed to generate post.");
  }
};

export const generateImage = async (prompt: string, referenceImageBase64?: string, count: number = 1, style?: string): Promise<string[]> => {
  const ai = getAiClient();
  
  const angles = [
    "Eye-level shot, natural perspective",
    "Low angle shot looking up, powerful/heroic vibe",
    "High angle bird's-eye view, showing context",
    "Close-up detail, focus on texture and emotion",
    "Wide-angle shot, expansive environment"
  ];

  const backgrounds = [
    "Clean studio minimalist background, neutral tones",
    "Natural outdoor setting with soft sunlight and depth",
    "Urban architectural environment, blurred city details",
    "Warm, cozy indoor ambient lighting",
    "Dynamic workspace or active environment"
  ];

  const generateSingle = async (index: number) => {
    try {
      const parts: any[] = [];
      
      const styleInstruction = style ? `\n\nVisual Style Guide: ${style.split('–')[0].trim()}.` : "";
      
      // Select variations based on index
      const angle = angles[index % angles.length];
      const background = backgrounds[index % backgrounds.length];
      
      const diversityInstruction = `
        Camera Angle: ${angle}.
        Background/Setting: ${background}.
        Ensure the image is visually distinct.
      `;

      if (referenceImageBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64(referenceImageBase64)
          }
        });
        
        parts.push({ 
          text: `Using this image as a reference, generate a variation based on: "${prompt}". 
                 ${styleInstruction}
                 ${diversityInstruction}` 
        });
      } else {
        parts.push({ text: `${prompt} ${styleInstruction} ${diversityInstruction}` });
      }

      const response = await ai.models.generateContent({
        model: 'imagen-3.0-generate-001', // Image generation model
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            numberOfImages: 1 // Generate one at a time for free tier
          }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
      return null;
    } catch (e) {
      console.error(`Image gen attempt ${index} failed`, e);
      return null;
    }
  };

  // --- FREE TIER OPTIMIZATION ---
  // Execute sequentially with delays to avoid rate limits
  const validImages: string[] = [];
  
  for (let i = 0; i < count; i++) {
     const img = await generateSingle(i);
     if (img) validImages.push(img);
     
     // Delay between requests to be kind to rate limiter
     if (i < count - 1) {
       await new Promise(r => setTimeout(r, 2000)); // 2 second delay
     }
  }
  
  if (validImages.length === 0) {
    throw new Error("Failed to generate images. Please try fewer variations or check quotas.");
  }

  return validImages;
};
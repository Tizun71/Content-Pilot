import { CrawlResult, GeneratedPost } from "../types";

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
console.log('API_BASE_URL:', API_BASE_URL);

export const planWorkflow = async (intent: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gemini/plan-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ intent }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in planWorkflow:', error);
    throw error;
  }
};

export const scanTopic = async (topic: string): Promise<CrawlResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gemini/scan-topic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in scanTopic:', error);
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
  try {
    const response = await fetch(`${API_BASE_URL}/api/gemini/generate-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context,
        tone,
        platform,
        language,
        length,
        imageBase64
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in generatePost:', error);
    throw error;
  }
};

export const generateImage = async (
  prompt: string,
  referenceImage?: string,
  count: number = 1,
  style?: string
): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gemini/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        referenceImage,
        count,
        style
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('Error in generateImage:', error);
    throw error;
  }
};

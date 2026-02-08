import { CrawlResult, GeneratedPost } from "../types";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://content-pilot-backend.vercel.app';
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      throw new Error(`Server error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error in planWorkflow:', error);
    throw new Error(`Failed to plan workflow: ${error.message}`);
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      throw new Error(`Server error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error in scanTopic:', error);
    throw new Error(`Failed to scan topic: ${error.message}`);
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      throw new Error(`Server error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error in generatePost:', error);
    throw new Error(`Failed to generate post: ${error.message}`);
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      throw new Error(`Server error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.images || [];
  } catch (error: any) {
    console.error('Error in generateImage:', error);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
};

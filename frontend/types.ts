export interface Source {
  title: string;
  uri: string;
}

export interface CrawlResult {
  summary: string;
  sources: Source[];
  rawText: string;
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export type ModuleType = 'INPUT' | 'SEARCH' | 'WRITE' | 'IMAGE' | 'PREVIEW' | 'PUBLISHER' | 'OUTPUT';

export interface ModuleInstance {
  id: string;
  type: ModuleType;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  error?: string;
  config: {
    enabled?: boolean;      // New: Toggle module on/off
    inputValue?: string;    // For INPUT (Text)
    selectedImage?: string; // For INPUT (Base64 Image)
    twitterAccessToken?: string; // For PUBLISHER (X Auth)
    tone?: string;          // For WRITE
    platform?: string;      // For WRITE ('Twitter')
    language?: string;      // For WRITE
    length?: string;        // For WRITE
    imageCount?: number;    // For IMAGE
    imageStyle?: string;    // For IMAGE
    previewMode?: string;   // For PREVIEW ('Twitter')
    autoPublish?: boolean;  // For PUBLISHER
  };
  output?: any;             // The result of this module's execution
}

export interface FlowContext {
  topic?: string;
  inputImage?: string; // Base64 of original input image
  twitterAccessToken?: string; // Auth token for X operations
  crawlResult?: CrawlResult;
  generatedPost?: GeneratedPost;
  generatedImages?: string[]; // Array of base64 strings
}
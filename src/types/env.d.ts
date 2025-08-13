declare namespace NodeJS {
  interface ProcessEnv {
    // Required for database connection
    DATABASE_URL: string;
    
    // Required for AI chat functionality
    OPENAI_API_KEY?: string;
    
    // Yamato Transport API integration (optional)
    YAMATO_API_KEY?: string;
    YAMATO_API_SECRET?: string;
    YAMATO_API_BASE_URL?: string;
    
    // Next.js environment
    NODE_ENV: 'development' | 'production' | 'test';
    
    // Public environment variables
    NEXT_PUBLIC_BASE_URL?: string;
  }
}
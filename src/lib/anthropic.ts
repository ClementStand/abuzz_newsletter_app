// Shared Anthropic client configuration

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client with API key from environment
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Model configurations
export const MODELS = {
  HAIKU: 'claude-3-haiku-20240307',
  SONNET: 'claude-3-5-sonnet-20241022',
} as const;

// Default settings for chat
export const CHAT_CONFIG = {
  model: MODELS.HAIKU, // Fast and cost-effective for chat
  maxTokens: 2000, // Sufficient for chat responses
  temperature: 1.0, // Default Anthropic temperature
} as const;

// Default settings for debrief
export const DEBRIEF_CONFIG = {
  model: MODELS.HAIKU,
  maxTokens: 4000, // Longer form content
  temperature: 1.0,
} as const;

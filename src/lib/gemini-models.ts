export interface GeminiModelOption {
  value: string;
  label: string;
  description: string;
}

export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  { value: 'googleai/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Recommended - Ultra fast and latest reasoning' },
  { value: 'googleai/gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Standard high-speed multimodal generation' },
  { value: 'googleai/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Lightweight & cost-efficient' },
  { value: 'googleai/gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Proven stability & fast responses' },
  { value: 'googleai/gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Complex reasoning & large context' },
];

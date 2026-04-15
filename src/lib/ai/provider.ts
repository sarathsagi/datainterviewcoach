export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIProvider {
  chat(messages: AIMessage[], systemPrompt?: string): Promise<AIResponse>;
  stream(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncIterable<string>;
}

export type ProviderName = "claude" | "openai";

export async function getAIProvider(
  name?: ProviderName
): Promise<AIProvider> {
  const providerName = name ?? (process.env.AI_PROVIDER as ProviderName) ?? "claude";

  switch (providerName) {
    case "claude": {
      const { ClaudeProvider } = await import("./claude");
      return new ClaudeProvider();
    }
    case "openai": {
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider();
    }
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

import OpenAI from "openai";
import { AIProvider, AIMessage, AIResponse } from "./provider";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(messages: AIMessage[], systemPrompt?: string): Promise<AIResponse> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: "system", content: systemPrompt });
    }

    for (const m of messages) {
      openaiMessages.push({
        role: m.role,
        content: m.content,
      } as OpenAI.Chat.ChatCompletionMessageParam);
    }

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      max_tokens: 4096,
    });

    return {
      content: response.choices[0]?.message?.content ?? "",
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }

  async *stream(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncIterable<string> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: "system", content: systemPrompt });
    }

    for (const m of messages) {
      openaiMessages.push({
        role: m.role,
        content: m.content,
      } as OpenAI.Chat.ChatCompletionMessageParam);
    }

    const stream = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      max_tokens: 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}

/**
 * Anthropic Messages API types for the agent loop.
 */

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ContentBlock = TextBlock | ToolUseBlock;

export interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
}

export interface AssistantMessage {
  role: 'assistant';
  content: ContentBlock[];
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ToolResultMessage {
  role: 'user';
  content: ToolResultBlock[];
}

export type ConversationMessage =
  | { role: 'user'; content: string }
  | AssistantMessage
  | ToolResultMessage;

import { AgentEnv } from '../models/env';
import { TOOL_DEFINITIONS, runTool } from './tools';
import {
  SERVICE_NAMES,
  FAILURE_MODES,
  INCIDENT_DURATION_MS,
  CLAUDE_MODEL,
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION,
  AGENT_MAX_ITERATIONS,
  AGENT_MAX_TOKENS,
  INVESTIGATE_DEADLINE_MS,
} from '../config';
import type {
  TextBlock,
  ToolUseBlock,
  AnthropicResponse,
  AssistantMessage,
  ToolResultBlock,
  ToolResultMessage,
  ConversationMessage,
} from '../models';

const INCIDENT_MINUTES = Math.round(INCIDENT_DURATION_MS / 60_000);
const SERVICE_CHAIN = SERVICE_NAMES.join(' → ');
const MODE_LIST = FAILURE_MODES.join(', ');

const SYSTEM_PROMPT = `\
You investigate a *simulated* checkout system (not real production infra).
Service chain (sequential; later services do not slow earlier ones in the same request):
  ${SERVICE_CHAIN}

Ground truth about this simulator:
- At most one active incident at a time, targeting exactly one service.
- Incident windows last about ${INCIDENT_MINUTES} minutes (then clear). Older errors in a long lookback may be from prior incidents — do not treat the tool lookback window as the incident duration.
- Exactly three failure modes: ${MODE_LIST}.
  - latency_spike: high latency, no (or almost no) errors
  - error_burst: elevated errors, latency near baseline
  - cascading_timeout: high latency AND errors (error text includes the mode name)
- Error message strings are canned labels from the simulator. Do not invent databases, connection pools, deploys, or traffic spikes beyond what the mode label already says.
- Upstream services can look fine while a downstream service is broken. Do not claim "cascade from X to Y" unless tools show X itself matching a failure mode.

Tools return first_seen / last_seen where available — use those for "since when", not the minutes= lookback arg.

Workflow: gather evidence with tools (prefer fewer calls). Then answer.

Final answer MUST be short plain text (no emoji, no markdown headers) covering exactly:
1. What's broken — service + one failure mode from: ${MODE_LIST}
2. Since when — approximate start from first_seen (and whether it still looks active via last_seen)
3. Likely cause — one sentence tying latency/errors to that mode; say "not confident" if unclear

Do not invent remediations. Do not guess.`;

/**
 * Hand-rolled Anthropic tool loop — no LangGraph (keeps the Worker under free-tier size).
 * Soft deadline returns a partial answer before the platform kills the request.
 */
export async function investigate(env: AgentEnv, userMessage: string): Promise<string> {
  const messages: ConversationMessage[] = [{ role: 'user', content: userMessage }];
  const deadline = Date.now() + INVESTIGATE_DEADLINE_MS;
  let lastPartial: string | null = null;

  for (let i = 0; i < AGENT_MAX_ITERATIONS; i++) {
    if (Date.now() >= deadline) {
      return timeoutMessage(lastPartial);
    }

    const remainingMs = deadline - Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, remainingMs));

    let res: Response;
    try {
      res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: AGENT_MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: TOOL_DEFINITIONS,
          messages,
        }),
      });
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
        return timeoutMessage(lastPartial);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    messages.push({ role: 'assistant', content: data.content } as AssistantMessage);

    const textBlock = data.content.find((b): b is TextBlock => b.type === 'text');
    if (textBlock?.text) {
      lastPartial = textBlock.text;
    }

    if (data.stop_reason !== 'tool_use') {
      return textBlock?.text ?? '(agent returned no text in final response)';
    }

    if (Date.now() >= deadline) {
      return timeoutMessage(lastPartial);
    }

    const toolCalls = data.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');

    const toolResults: ToolResultBlock[] = await Promise.all(
      toolCalls.map(async (block) => {
        try {
          const result = await runTool(env, block.name, block.input);
          let isError = false;
          try {
            const parsed = JSON.parse(result) as unknown;
            if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
              isError = true;
            }
          } catch {
            // non-JSON result
          }
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
            is_error: isError,
          };
        } catch (err) {
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: String(err),
            is_error: true,
          };
        }
      })
    );

    messages.push({ role: 'user', content: toolResults } as ToolResultMessage);
  }

  return (
    `Investigation incomplete: reached the ${AGENT_MAX_ITERATIONS}-iteration limit. ` +
    `Try a more specific question (e.g. "check payment-service for the last 30 minutes").`
  );
}

function timeoutMessage(partial: string | null): string {
  const base =
    `Investigation stopped early to stay within the Worker wall-clock budget ` +
    `(~${Math.round(INVESTIGATE_DEADLINE_MS / 1000)}s soft deadline). ` +
    `Ask a narrower question, or upgrade to Workers Paid for longer CPU.`;
  if (partial) {
    return `${base}\n\nPartial findings so far:\n${partial}`;
  }
  return base;
}

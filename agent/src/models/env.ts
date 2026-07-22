/** Bindings needed by the investigation agent (Analytics Engine SQL + Anthropic). */
export interface AgentEnv {
  ANTHROPIC_API_KEY: string;
  CF_ACCOUNT_ID: string;
  CF_ANALYTICS_TOKEN: string;
}

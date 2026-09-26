import type { TemplateContext } from '../types';

export function generateTelemetryPrompt(ctx: TemplateContext): string {
  return `If \`TEL_PROMPTED\` is \`no\`: do NOT ask about telemetry. paysec never uploads usage data. Silently run:
\`\`\`bash
${ctx.paths.binDir}/paysec-config set telemetry off
touch ~/.paysec/.telemetry-prompted
\`\`\``;
}

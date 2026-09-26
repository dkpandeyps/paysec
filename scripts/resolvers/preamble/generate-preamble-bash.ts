import type { TemplateContext } from '../types';
import { quoteSafePath } from '../types';
import { getHostConfig } from '../../../hosts/index';

export function generatePreambleBash(ctx: TemplateContext): string {
  const hostConfig = getHostConfig(ctx.host);
  const runtimeRoot = hostConfig.usesEnvVars
    ? `_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
PAYSEC_ROOT="$HOME/${hostConfig.globalRoot}"
[ -n "$_ROOT" ] && [ -d "$_ROOT/${ctx.paths.localSkillRoot}" ] && PAYSEC_ROOT="$_ROOT/${ctx.paths.localSkillRoot}"
PAYSEC_BIN="$PAYSEC_ROOT/bin"
PAYSEC_BROWSE="$PAYSEC_ROOT/browser/dist"
PAYSEC_DESIGN="$PAYSEC_ROOT/design/dist"
`
    : '';

  // The probe body lives in bin/paysec-preamble (it used to be ~6KB inlined
  // here, re-typed by the agent on every skill run). Per-skill and per-host
  // values travel as flags; $PPID is passed explicitly because the script's
  // own $PPID would be the throwaway tool shell, not the agent session.
  const brainHealth = ctx.host === 'gbrain' || ctx.host === 'hermes' ? ' --brain-health' : '';
  return `## Preamble (run first)

\`\`\`bash
${runtimeRoot}_PAYSEC_PREAMBLE="${quoteSafePath(ctx.paths.binDir)}/paysec-preamble"; [ -x "$_PAYSEC_PREAMBLE" ] || _PAYSEC_PREAMBLE="${quoteSafePath(ctx.paths.localSkillRoot)}/bin/paysec-preamble"
if [ -x "$_PAYSEC_PREAMBLE" ]; then "$_PAYSEC_PREAMBLE" --skill ${ctx.skillName} --overlay ${ctx.model ?? 'none'} --ppid "$PPID"${brainHealth}; else echo "PAYSEC_PREAMBLE: unavailable (paysec bin not found; re-run ./setup)"; fi
\`\`\``;
}

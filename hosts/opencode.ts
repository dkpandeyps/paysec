import { defineHost } from './define-host';

const opencode = defineHost({
  name: 'opencode',
  displayName: 'OpenCode',

  globalRoot: '.config/opencode/skills/paysec',  // XDG config dir, not ~/.opencode

  // OpenCode links a wider runtime asset set than the shared default
  // (design binary, review specialists, qa templates/references, DX hall of fame).
  runtimeRoot: {
    globalSymlinks: ['bin', 'browser/dist', 'browser/bin', 'design/dist', 'paysec-upgrade', 'ETHOS.md', 'pr-review/specialists', 'qa-fix/templates', 'qa-fix/references', 'plan-dx-review/dx-hall-of-fame.md'],
    globalFiles: {
      'pr-review': ['checklist.md', 'design-checklist.md', 'greptile-triage.md', 'TODOS-format.md'],
    },
  },
});

export default opencode;

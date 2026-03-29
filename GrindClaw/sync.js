const fs = require('fs');
const path = require('path');

const WORKSPACE = path.join(process.env.USERPROFILE || process.env.HOME, '.openclaw', 'workspace');
const PROJECT = __dirname;

const skills = [
  ['ALARM',        'morning-alarm'],
  ['DAILY-DEBRIEF','daily-debrief'],
  ['GRINDSCORE',   'grind-score'],
  ['TODO',         'todo-tracker'],
];

for (const [src, dest] of skills) {
  const destDir = path.join(WORKSPACE, 'skills', dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(
    path.join(PROJECT, 'Skills', src, 'SKILL.md'),
    path.join(destDir, 'SKILL.md')
  );
  console.log(`✓ Skills/${src} → ${dest}`);
}

console.log('\nSync complete.');

const fs = require('fs');
const cssPath = './client/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');
const darkTheme = `
[data-theme='dark'] {
  --page: #0b1120;
  --surface: #172133;
  --ink: #e2e8f0;
  --ink-soft: #94a3b8;
  --ink-faint: #64748b;
  --navy: #f1f5f9;
  --navy-deep: #ffffff;
  --line: #334155;
  --line-strong: #475569;
  --blue: #60a5fa;
  --blue-dark: #3b82f6;
  --blue-soft: #1e3a8a;
  --teal: #2dd4bf;
  --teal-dark: #14b8a6;
  --teal-soft: #134e4a;
  --green: #4ade80;
  --green-soft: #166534;
  --amber: #fbbf24;
  --amber-soft: #78350f;
  --red: #f87171;
  --red-soft: #7f1d1d;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, .5);
  --shadow-md: 0 14px 30px rgba(0, 0, 0, .6);
}`;
if (!css.includes("[data-theme='dark']")) {
    css = css.replace(/:root \{[^}]+\}/, match => match + '\n' + darkTheme);
    fs.writeFileSync(cssPath, css);
    console.log("Added");
}

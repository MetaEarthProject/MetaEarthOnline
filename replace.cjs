const fs = require('fs');

let css = fs.readFileSync('src/styles.css', 'utf8');

css = css.replace(/\.phone-screen \{\r?\n  width: 100%;\r?\n  height: 100dvh;\r?\n  min-height: 100dvh;\r?\n  border: none;\r?\n  background: #050505;\r?\n  box-shadow: none;\r?\n  display: flex;\r?\n  flex-direction: column;\r?\n  position: relative;\r?\n  overflow: hidden;\r?\n\}/, 
`.phone-screen {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  height: 100dvh;
  min-height: 100dvh;
  border: none;
  background: #050505;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}`);

css = css.replace(/\.work-resource-name \{\r?\n  color: #b8b8b8;\r?\n  font-size: 0\.66rem;\r?\n  line-height: 1\.05;\r?\n  font-weight: 700;\r?\n  text-transform: uppercase;\r?\n  font-family: var\(--work-ui-font\);\r?\n\}/,
`.work-resource-name {
  color: #a0a0a0;
  font-size: 0.55rem;
  line-height: 1.1;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: var(--work-ui-font);
}`);

css = css.replace(/\.work-resource-value \{\r?\n  font-size: 1\.18rem;\r?\n  line-height: 1;\r?\n  font-weight: 800;\r?\n  font-family: var\(--work-ui-font\);\r?\n  text-shadow: 0 2px 0 rgba\(0, 0, 0, 0\.38\);\r?\n\}/,
`.work-resource-value {
  font-size: 0.95rem;
  line-height: 1;
  font-weight: 900;
  font-family: var(--work-display-font);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  letter-spacing: -0.01em;
}`);

css = css.replace(/\.work-resource-symbol \{\r?\n  color: #8a8a8a;\r?\n  font-size: 0\.64rem;\r?\n  line-height: 1;\r?\n  font-family: var\(--work-ui-font\);\r?\n\}/,
`.work-resource-symbol {
  color: #707070;
  font-size: 0.55rem;
  line-height: 1;
  font-family: var(--work-ui-font);
  font-weight: 800;
}`);

const btnTargetRegex = /\.work-primary-btn,\r?\n\.work-secondary-btn \{[\s\S]*?box-shadow: inset 0 0 0 1px #fff0dc66;\r?\n\}/;

css = css.replace(btnTargetRegex, 
`.work-primary-btn,
.work-secondary-btn {
  width: 100%;
  border: 1px solid rgba(243, 229, 186, 0.25);
  padding: 12px 10px;
  color: var(--work-gold);
  font-size: 0.82rem;
  font-family: var(--work-ui-font);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.work-primary-btn:hover,
.work-secondary-btn:hover {
  filter: brightness(1.2);
}

.work-primary-btn {
  margin-top: 10px;
  background: linear-gradient(180deg, #2a2518, #15120a);
}

.work-secondary-btn {
  margin-top: 12px;
  background: linear-gradient(180deg, #302018, #1a100a);
  border-color: rgba(220, 100, 80, 0.4);
  color: #ff9e80;
}

.work-secondary-btn.active {
  border-color: rgba(120, 220, 100, 0.6);
  color: #a0ff9e;
  background: linear-gradient(180deg, #18301a, #0a1a0c);
}`);


fs.writeFileSync('src/styles.css', css);
console.log('done replacing');

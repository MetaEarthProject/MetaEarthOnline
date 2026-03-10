const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');

// 1. fixing the large icons 52px -> 42px
css = css.replace(/grid-template-columns: 52px 1fr;/g, 'grid-template-columns: 42px 1fr;');
css = css.replace(/width: 52px;\r?\n  height: 52px;/g, 'width: 42px;\n  height: 42px;');

// 2. fix the font-size of the + button
css = css.replace(/\.work-plus-btn \{\r?\n  background: linear-gradient\(180deg, #6b6b6b, #414141\);\r?\n  color: #fff;\r?\n  font-size: 1\.6rem;\r?\n  line-height: 1;\r?\n\}/,
    `.work-plus-btn {
  background: linear-gradient(180deg, #444, #222);
  color: var(--work-gold);
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1;
}`);

// 3. refine the plus and refill buttons border colors
css = css.replace(/\.work-plus-btn,\r?\n\.work-refill-btn,\r?\n\.work-energy-cost \{\r?\n  height: 42px;\r?\n  border: 1px solid #6b6b6b;\r?\n\}/,
    `.work-plus-btn,
.work-refill-btn,
.work-energy-cost {
  height: 38px;
  border: 1px solid rgba(243, 229, 186, 0.4);
  border-radius: 2px;
}`);

// 4. refine energy track
css = css.replace(/\.work-energy-track \{\r?\n  height: 8px;\r?\n  border: 1px solid #4a4a4a;\r?\n  background: #161616;\r?\n\}/,
    `.work-energy-track {
  height: 6px;
  border: 1px solid rgba(243, 229, 186, 0.2);
  background: #101010;
  border-radius: 2px;
  overflow: hidden;
}`);

// 5. refine `.work-refill-btn`
css = css.replace(/\.work-refill-btn \{\r?\n  background: linear-gradient\(180deg, #ddd, #c5c5c5\);\r?\n  color: #4a4a4a;\r?\n  font-size: 0\.86rem;\r?\n  font-family: var\(--work-ui-font\);\r?\n\}/,
    `.work-refill-btn {
  background: linear-gradient(180deg, #1a1a1a, #0a0a0a);
  color: var(--work-gold);
  font-size: 0.75rem;
  font-family: var(--work-ui-font);
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.05em;
}`);

fs.writeFileSync('src/styles.css', css);
console.log('done replacing smaller icons');

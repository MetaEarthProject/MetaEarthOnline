import fs from 'fs';

const files = ['src/App.tsx', 'src/styles.css'];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // replace rr- with me- globally
    content = content.replace(/rr-/g, 'me-');

    if (file === 'src/App.tsx') {
        // Also remove profile-page from profile tab wrapper to avoid double padding/conflicts
        content = content.replace(/className="profile-page me-profile-page"/g, 'className="me-profile-page"');
    }

    // Also fix me-profile-page padding/margin if any
    if (file === 'src/styles.css') {
        // Let's add padding 8px to me-profile-page and remove profile-mode padding to keep it clean, OR just let me-profile-page handle it
        content = content.replace(/\.phone-content\.profile-mode \{\r?\n  background: linear-gradient\(180deg, #1a1a1a 0%, #0e0e0e 42%, #080808 100%\);\r?\n  padding: 6px 6px 10px;\r?\n\}/g,
            `.phone-content.profile-mode {
  background: linear-gradient(180deg, #1a1a1a 0%, #0e0e0e 42%, #080808 100%);
  padding: 0;
}`);

        content = content.replace(/\.me-profile-page \{\r?\n  display: grid;\r?\n  gap: 8px;\r?\n  color: #eef2f9;\r?\n\}/g,
            `.me-profile-page {
  display: grid;
  gap: 8px;
  padding: 12px;
  color: #eef2f9;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}`);
    }

    fs.writeFileSync(file, content);
}
console.log('done renaming and fixing spacing');

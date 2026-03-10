const fs = require('fs');
let c = fs.readFileSync('src/styles.css', 'utf8');

// Fix all profile section cards to stay in grid
c = c.replace(
    /\.me-profile-card,\r?\n\.me-profile-panel,\r?\n\.me-profile-stats,\r?\n\.me-profile-action-row,\r?\n\.me-profile-laws \{\r?\n  border: 1px solid #454950;\r?\n  background: linear-gradient\(180deg, #30333a 0%, #1b1d21 100%\);\r?\n  box-shadow: inset 0 1px 0 rgba\(255, 255, 255, 0.04\);\r?\n\}/,
    `.me-profile-card,
.me-profile-panel,
.me-profile-stats,
.me-profile-action-row,
.me-profile-laws {
  border: 1px solid #454950;
  background: linear-gradient(180deg, #30333a 0%, #1b1d21 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  min-width: 0;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}`
);

// Fix individual card padding
c = c.replace(
    /\.me-profile-card \{\r?\n  padding: 8px;\r?\n\}/,
    `.me-profile-card {
  padding: 10px;
}`
);

// Remove white-space: nowrap on rank span to prevent overflow bleed
c = c.replace(
    /\.me-profile-money-row span \{\r?\n  color: #d8de67;\r?\n  font-size: 0.68rem;\r?\n  font-weight: 800;\r?\n  white-space: nowrap;\r?\n\}/,
    `.me-profile-money-row span {
  color: #d8de67;
  font-size: 0.68rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}`
);

// Also fix me-profile-page to clip properly
c = c.replace(
    /\.me-profile-page \{\r?\n  display: grid;\r?\n  gap: 8px;\r?\n  padding: 12px;\r?\n  color: #eef2f9;\r?\n  width: 100%;\r?\n  box-sizing: border-box;\r?\n  overflow-x: hidden;\r?\n\}/,
    `.me-profile-page {
  display: grid;
  gap: 8px;
  padding: 10px;
  color: #eef2f9;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}`
);

fs.writeFileSync('src/styles.css', c);
console.log('done');

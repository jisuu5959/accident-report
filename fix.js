const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 새로고침 버튼 중복 제거
const doubleBtn = `              <button onClick={loadSituationReports} style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>새로고침</button>
              <button onClick={loadSituationReports} style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>새로고침</button>`;

const singleBtn = `              <button onClick={loadSituationReports} style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>새로고침</button>`;

if(c.includes(doubleBtn)) {
  c = c.replace(doubleBtn, singleBtn);
  console.log('완료');
} else {
  console.log('못찾음 - 직접 확인 필요');
  const idx = c.indexOf('새로고침');
  console.log(JSON.stringify(c.slice(idx-50, idx+200)));
}

fs.writeFileSync('src/App.js', c, 'utf8');
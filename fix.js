const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 보고현황 버튼에 onClick 추가
c = c.replace(
  `              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,\r\n            }}\r\n          >\r\n             보고 현황 전체 보기`,
  `              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,\r\n            }}\r\n            onClick={() => go(SCREENS.TIMELINE)}\r\n          >\r\n             보고 현황 전체 보기`
);

// dispatches 구독 위치 확인
const idx = c.indexOf('dispatches-channel');
console.log('dispatches 위치:', idx);
console.log(JSON.stringify(c.slice(idx-100, idx+50)));

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
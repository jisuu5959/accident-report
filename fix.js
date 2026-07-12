const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 1. 상급자 카드 클릭 → SUPERVISOR로 수정
c = c.replace(
  `                    onClick={() => go(SCREENS.TIMELINE)}`,
  `                    onClick={() => go(SCREENS.SUPERVISOR)}`
);

console.log('완료:', c.includes("onClick={() => go(SCREENS.SUPERVISOR)}") ? 'OK' : 'FAIL');
fs.writeFileSync('src/App.js', c, 'utf8');
const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 상급자 대시보드 카드 클릭 → TIMELINE으로 이동
c = c.replace(
  `                    onClick={() => go(SCREENS.SUPERVISOR)}`,
  `                    onClick={() => go(SCREENS.TIMELINE)}`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료:', c.includes('go(SCREENS.TIMELINE)') ? 'OK' : 'FAIL');
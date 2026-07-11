const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 모든 깨진 문자 제거
c = c.replace(/\uFFFD/g, '');

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료, 파일크기:', c.length);
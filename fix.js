const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');
const lines = c.split('\n');
lines.splice(2910, 4);
fs.writeFileSync('src/App.js', lines.join('\n'), 'utf8');
console.log('완료, 총 라인:', lines.length);
const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');
const lines = c.split('\n');
lines.splice(2865, 1);
fs.writeFileSync('src/App.js', lines.join('\n'), 'utf8');
console.log('완료');
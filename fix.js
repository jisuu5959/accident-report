const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

c = c.replace(
  `if (userRole !== "supervisor") return;\r\n    const channel = supabase\r\n      .channel("accident-reports`,
  `if (userRole !== "supervisor" && userRole !== "situation") return;\r\n    const channel = supabase\r\n      .channel("accident-reports`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
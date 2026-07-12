const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

c = c.replace(
  `                        <span style={{ background: \"#FFF5F5\", color: \"#C53030\", fontSize: 11, fontWeight: 700, padding: \"2px 8px\", borderRadius: 20, border: \"1px solid #FED7D7\" }}>진행중</span>`,
  `                        <span style={{ background: acc.status === "완료" ? "#F0FFF4" : "#FFF5F5", color: acc.status === "완료" ? "#276749" : "#C53030", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: acc.status === "완료" ? "1px solid #9AE6B4" : "1px solid #FED7D7" }}>{acc.status || "진행중"}</span>`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
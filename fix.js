const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

c = c.replace(
  `                    // 사고 목록 갱신
                    loadSituationReports();`,
  `                    // 사고 목록 갱신 - state 즉시 업데이트
                    setAccidentReports(prev => prev.map(a => 
                      a.status === "진행중" ? {...a, status: "완료"} : a
                    ));`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
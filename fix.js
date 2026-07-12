const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 작업자 Realtime 구독에 상황종료 처리 추가
c = c.replace(
  `          if (directive.action_key === "응급조치_병원입력") {
            setShowHospitalInput(true);
            return;
          }`,
  `          if (directive.action_key === "응급조치_병원입력") {
            setShowHospitalInput(true);
            return;
          }
          if (directive.action_key === "상황종료") {
            const closeNotif = {
              id: directive.id,
              title: "상황 종료",
              body: "모든 조치가 완료되었습니다. 상황이 종료됩니다.",
              message: "모든 조치가 완료되었습니다.\\n상황실에서 상황을 종료했습니다.",
              actionLabel: "상황 종료",
              supervisorName: "안전 상황실",
              sentAt: directive.sent_at,
            };
            setActiveNotif(closeNotif);
            return;
          }`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
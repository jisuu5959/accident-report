const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 작업자 Realtime에 병원이름_입력완료, 상황종료 수신 처리 추가
c = c.replace(
  `          if (directive.action_key === "응급조치_병원입력") {\r\n            setShowHospitalInput(true);\r\n            return;\r\n          }\r\n\r\n          const newNotif = {`,
  `          if (directive.action_key === "응급조치_병원입력") {\r\n            setShowHospitalInput(true);\r\n            return;\r\n          }\r\n\r\n          if (directive.action_key === "병원이름_입력완료") {\r\n            const hospNotif = {\r\n              id: directive.id,\r\n              title: "병원 이송 정보 접수",\r\n              body: directive.message,\r\n              message: directive.message,\r\n              actionLabel: "병원 이송 정보",\r\n              supervisorName: directive.supervisor_name,\r\n              sentAt: directive.sent_at,\r\n            };\r\n            setNotifBanner(hospNotif);\r\n            setTimeout(() => setNotifBanner(null), 5000);\r\n            return;\r\n          }\r\n\r\n          if (directive.action_key === "상황종료") {\r\n            const closeNotif = {\r\n              id: directive.id,\r\n              title: "상황 종료",\r\n              body: "모든 조치가 완료되었습니다. 상황이 종료됩니다.",\r\n              message: "모든 조치가 완료되었습니다.",\r\n              actionLabel: "상황 종료",\r\n              supervisorName: "안전 상황실",\r\n              sentAt: directive.sent_at,\r\n            };\r\n            setActiveNotif(closeNotif);\r\n            return;\r\n          }\r\n\r\n          const newNotif = {`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료:', c.includes('병원이름_입력완료') ? 'OK' : 'FAIL');
const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 1. 상급자 카드 클릭 TIMELINE → SUPERVISOR로
c = c.replace(
  `                    onClick={() => go(SCREENS.TIMELINE)}`,
  `                    onClick={() => go(SCREENS.SUPERVISOR)}`
);

// 2. tlEvents 초기값 비우기
c = c.replace(
  `  const [tlEvents, setTlEvents] = useState([
    { time: "14:35", text: "사고 발생", color: "#E24B4A" },
    { time: "14:36", text: "1차 보고 접수", color: "#E24B4A" },
    { time: "14:37", text: "작업중지 재지시 + 대피 요청", color: "#BA7517" },
  ]);`,
  `  const [tlEvents, setTlEvents] = useState([]);`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
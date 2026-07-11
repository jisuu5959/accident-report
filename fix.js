const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 마지막 return null을 배너 포함으로 교체
c = c.replace(
  '  return (\n    <>\n      <NotifBanner />\n      <NotifPopup />\n    </>\n  );\n}',
  '  return null;\n}'
);

// 각 화면 return 문 앞에 전역 오버레이 추가
c = c.replace(
  '  if (screen === SCREENS.LOGIN) {',
  `  // 전역 알람 오버레이
  const GlobalOverlay = () => (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 99999 }}>
      <div style={{ pointerEvents: "auto" }}>
        <NotifBanner />
        <NotifPopup />
        <HospitalInputPopup />
      </div>
    </div>
  );

  if (screen === SCREENS.LOGIN) {`
);

// 모든 화면에서 NotifBanner/NotifPopup/HospitalInputPopup 제거하고 GlobalOverlay로 대체
c = c.replace(/<NotifBanner \/><NotifPopup \/><HospitalInputPopup \/>/g, '<GlobalOverlay />');

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
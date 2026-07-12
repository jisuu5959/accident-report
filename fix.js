const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// TIMELINE 화면 전체를 DB 연동 버전으로 교체
const start = c.indexOf('  // ── 화면 08-B: 보고 현황 타임라인');
const end = c.indexOf('\n  if (screen === SCREENS.SITUATION_DETAIL', start);

const newTimeline = `  // ── 화면 08-B: 보고 현황 타임라인 ────────────────────
  if (screen === SCREENS.TIMELINE) {
    const loadTimeline = async () => {
      const results = [];
      // 사고 보고 불러오기
      const { data: reports } = await supabase
        .from("accident_reports")
        .select("*")
        .order("created_at", { ascending: true });
      if (reports) {
        reports.forEach(r => {
          results.push({
            time: new Date(r.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
            text: "1차 보고 — " + r.accident_type + " / " + r.worker_name + " / " + r.location,
            color: "#E24B4A",
          });
        });
      }
      // 상급자 지시 불러오기
      const { data: dirs } = await supabase
        .from("directives")
        .select("*")
        .order("sent_at", { ascending: true });
      if (dirs) {
        dirs.forEach(d => {
          if (d.action_key === "응급조치_병원입력") return;
          results.push({
            time: new Date(d.sent_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
            text: (d.action_key === "병원이름_입력완료" ? "병원 이름 입력 — " : "상급자 지시 — ") + d.action_label + (d.supervisor_name ? " (" + d.supervisor_name + ")" : ""),
            color: d.action_key === "병원이름_입력완료" ? "#6B46C1" : "#2B6CB0",
          });
        });
      }
      // 출동 지시 불러오기
      const { data: disps } = await supabase
        .from("dispatches")
        .select("*")
        .order("dispatched_at", { ascending: true });
      if (disps) {
        disps.forEach(d => {
          results.push({
            time: new Date(d.dispatched_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
            text: "출동 지시 — " + d.dispatcher_name + (d.accident_minutes ? " / 사고장소 " + d.accident_minutes + "분" : "") + (d.hospital_minutes ? " / 병원 " + d.hospital_minutes + "분" : ""),
            color: "#276749",
          });
        });
      }
      // 시간순 정렬
      results.sort((a, b) => a.time.localeCompare(b.time));
      setTlEvents(results);
    };

    if (tlEvents.length <= 3) loadTimeline();

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>배터리</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={goHome}>‹</button>
          <span style={styles.headerTitle}>보고 현황</span>
          <button
            onClick={loadTimeline}
            style={{ background: "none", border: "none", fontSize: 13, color: "#E53E3E", cursor: "pointer", fontWeight: 700 }}
          >새로고침</button>
        </div>
        <div style={styles.body}>
          {tlEvents.length === 0 ? (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "40px 0" }}>
              아직 기록된 내용이 없습니다.
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 13, top: 14, bottom: 14, width: 2, background: "#E2E8F0", zIndex: 0 }} />
              {tlEvents.map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, position: "relative", zIndex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: ev.color, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700,
                  }}>✓</div>
                  <div style={{ flex: 1, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{ev.text}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ev.color, background: ev.color + "18", borderRadius: 4, padding: "1px 6px" }}>{ev.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

`;

c = c.slice(0, start) + newTimeline + c.slice(end);
fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료, 시작:', start, '끝:', end);
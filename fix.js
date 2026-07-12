const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

c = c.replace(
  `                  onClick={async () => {
                    if(!window.confirm("상황을 종료하시겠습니까?")) return;
                    await supabase.from("directives").insert({
                      accident_id: "2024-0625-001",
                      action_key: "상황종료",
                      action_label: "상황 종료",
                      message: "모든 조치가 완료되었습니다. 상황을 종료합니다.",
                      supervisor_name: "안전 상황실",
                    });
                  }}`,
  `                  onClick={async () => {
                    if(!window.confirm("상황을 종료하시겠습니까?")) return;
                    // 사고 status 완료로 변경
                    await supabase.from("accident_reports")
                      .update({ status: "완료" })
                      .eq("status", "진행중");
                    // 작업자/상급자에게 알람
                    await supabase.from("directives").insert({
                      accident_id: "2024-0625-001",
                      action_key: "상황종료",
                      action_label: "상황 종료",
                      message: "모든 조치가 완료되었습니다. 상황을 종료합니다.",
                      supervisor_name: "안전 상황실",
                    });
                    // 사고 목록 갱신
                    loadSituationReports();
                  }}`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');
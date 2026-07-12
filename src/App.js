
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase 연결 설정 ──────────────────────────────────
const supabase = createClient(
  "https://tutmzebsvcslrjallesi.supabase.co",
  "sb_publishable_e3q0H3KfAUYU7ZZXqqB4Aw_ScrLx41m"
);

const SCREENS = {
  LOGIN: "login",
  MAIN: "main",
  ACCIDENT_TYPE: "accident_type",
  LOCATION: "location",
  DETAILS: "details",
  PHOTOS: "photos",
  ACTIONS: "actions",
  RECIPIENTS: "recipients",
  COMPLETE: "complete",
  WORKER_TIMELINE: "worker_timeline",
  SUPERVISOR_DASHBOARD: "supervisor_dashboard", // 상급자 첫 화면 — 사고 현황
  SUPERVISOR: "supervisor",
  TIMELINE: "timeline",
  SITUATION_ROOM: "situation_room",
  SITUATION_DETAIL: "situation_detail",
  EMERGENCY: "emergency",                       // 비상 연락망
  SMS: "sms",
};

// ── 업무 유형별 보고 대상 ──────────────────────────────
const RECIPIENTS_BY_TYPE = {
  유지보수: [
    { tier: "1차 보고 (현장책임자)", name: "김현당 팀장", phone: "010-1234-5678" },
    { tier: "2차 보고 (유지보수 관리자)", name: "최유지 과장", phone: "010-5678-1234" },
    { tier: "3차 보고 (안전관리자)", name: "이인판 차장", phone: "010-2345-6789" },
    { tier: "상황실", name: "안전상황실", phone: "02-123-4567" },
  ],
  운용투자: [
    { tier: "1차 보고 (현장책임자)", name: "김현당 팀장", phone: "010-1234-5678" },
    { tier: "2차 보고 (투자사업 담당)", name: "박투자 차장", phone: "010-9876-5432" },
    { tier: "3차 보고 (사업부장)", name: "박관리 부장", phone: "010-3456-7890" },
    { tier: "4차 보고 (안전관리자)", name: "이인판 차장", phone: "010-2345-6789" },
    { tier: "상황실", name: "안전상황실", phone: "02-123-4567" },
  ],
};
const acidentTypes = [
  { id: "fall", label: "추락", icon: "🧗" },
  { id: "electric", label: "감전", icon: "⚡" },
  { id: "collapse", label: "협착", icon: "🔩" },
  { id: "fallobj", label: "낙하/비래", icon: "🪨" },
  { id: "fire", label: "화재/폭발", icon: "🔥" },
  { id: "traffic", label: "교통사고", icon: "🚗" },
  { id: "collapse2", label: "붕괴/도괴", icon: "🏗️" },
  { id: "other", label: "기타", icon: "•••" },
];

const smsMessages = [
  {
    step: "1차 보고",
    from: "현장 → 팀장",
    time: "14:36",
    content: "[중대재해 1차 보고]\n- 일시: 06/25 14:35\n- 장소: 서산 대산공장\n- 유형: 추락\n- 현장 작업자: 김철수\n\n즉시 확인 바랍니다.\n",
    color: "#E53E3E",
  },
  {
    step: "2차 보고",
    from: "팀장 → 차장",
    time: "14:37",
    content: "[중대재해 2차 보고]\n- 일시: 06/25 14:35\n- 장소: 서산 대산공장\n- 유형: 추락\n- 팀장 확인 완료\n\n지시 및 조치 바랍니다.\n",
    color: "#DD6B20",
  },
  {
    step: "3차 보고",
    from: "차장 → 부장",
    time: "14:39",
    content: "[중대재해 3차 보고]\n- 일시: 06/25 14:35\n- 장소: 서산 대산공장\n- 유형: 추락\n- 현재 조치율: 60%\n\n확인 후 지시 바랍니다.\n",
    color: "#2B6CB0",
  },
  {
    step: "상황실 알림",
    from: "→ 상황실",
    time: "14:40",
    content: "[중대재해 상황 알림]\n- 사고 ID: 2024-0625-001\n- 유형: 추락\n- 장소: 서시 대산공장\n- 현재 단계: 2차 보고\n\n상황실에서 확인 바랍니다.\n",
    color: "#553C9A",
  },
];

// ── 보고 완료 화면 컴포넌트 ─────────────────────────
function CompleteScreen({ go }) {
  return (
    <div style={{
      width: "100%", maxWidth: 375, minHeight: "100vh",
      background: "#fff", display: "flex", flexDirection: "column",
      fontFamily: "'Apple SD Gothic Neo', sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px 4px", fontSize: 12, fontWeight: 700 }}>
        <span>9:41</span><span>📶 </span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: "#E53E3E",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff", marginBottom: 20,
        }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8, textAlign: "center" }}>
          1차 보고가 완료되었습니다.
        </div>
        <div style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 1.6, marginBottom: 32 }}>
          보고 내용이 등록되었으며,<br />지정된 대상자에게 전송되었습니다.
        </div>
        <div style={{
          width: "100%", background: "#FFF5F5", border: "1px solid #FED7D7",
          borderRadius: 12, padding: "16px", marginBottom: 24,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⏳</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#C53030", marginBottom: 4 }}>
              상급자 조치 지시를 기다려주세요
            </div>
            <div style={{ fontSize: 12, color: "#744210", lineHeight: 1.6 }}>
              상급자가 조치 지시를 하면 알림이 옵니다.<br />
              알림을 확인하고 조치에 따라 대응해주세요.
            </div>
          </div>
        </div>
        <button
          onClick={() => go(SCREENS.WORKER_TIMELINE)}
          style={{
            width: "100%", padding: "14px", background: "#1A365D",
            border: "none", borderRadius: 10, fontSize: 14,
            fontWeight: 700, color: "#fff", cursor: "pointer", marginBottom: 10,
          }}
        > 보고 현황 보기</button>
        <button
          onClick={() => go(SCREENS.SUPERVISOR_DASHBOARD)}
          style={{
            width: "100%", padding: "13px", background: "#fff",
            border: "1.5px solid #ddd", borderRadius: 10, fontSize: 14,
            fontWeight: 600, color: "#666", cursor: "pointer",
          }}
        >사고 현황 보기</button>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [userRole, setUserRole] = useState(null);
  const [workType, setWorkType] = useState(null);

  // ── 로그인 state ──────────────────────────────────────
  const [loginStep, setLoginStep] = useState("phone");   // "phone" | "verify"
  const [phoneNum, setPhoneNum] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [accidentDate] = useState(() => {
    const d = new Date();
    const days = ["일","월","화","수","목","금","토"];
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} (${days[d.getDay()]}) ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  });
  // 위치 관련 state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAddress, setGpsAddress] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [accidentContent, setAccidentContent] = useState("옥외 배관 점검 중 난간 파손으로 추락");
  const [hasInjured, setHasInjured] = useState(true);
  const [injuredName, setInjuredName] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(false);
  const [checkedRecipients, setCheckedRecipients] = useState([]);
  const [actionStatus, setActionStatus] = useState({
    stop: "partial",   // 작업 중지 항목 하나 체크됨
    control: "idle",
    report119: "idle",
  });
  const [actionTimes, setActionTimes] = useState({}); // 조치 항목별 마지막 상태변경 시각
  // 세부 체크리스트 항목별 체크여부/체크시각 (key: "stop-0" 형태)
  const [subItemChecked, setSubItemChecked] = useState({ "stop-0": true });
  const [subItemTimes, setSubItemTimes] = useState(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    return { "stop-0": hhmm };
  });
  // 상급자 체크리스트 state
  const [checklistDone, setChecklistDone] = useState({
    재지시대피: false, 현장보존: false, 병원이송: false,
  });
  const [directiveSent, setDirectiveSent] = useState({});
  const [directiveTimes, setDirectiveTimes] = useState({});
  const [activeDirective, setActiveDirective] = useState(null);
  const [directiveTexts, setDirectiveTexts] = useState({});
  const [directiveEditing, setDirectiveEditing] = useState({});
  // 현장작업자 조치 체크리스트
  const [workerChecklist, setWorkerChecklist] = useState({
    대피: false, 연락: false, 응급: false, 통제: false, 보존: false,
  });
  const [workerCheckTimes, setWorkerCheckTimes] = useState({});

  // ── 상황실 state ──────────────────────────────────────
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [situationFilter, setSituationFilter] = useState("전체");
  const [dispatchState, setDispatchState] = useState({});
  const [accidentReports, setAccidentReports] = useState([]);  // DB에서 불러온 사고 목록
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [accMin, setAccMin] = useState("");
  const [hospMin, setHospMin] = useState("");
  const [dispatchedMembers, setDispatchedMembers] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "worker", team: "", position: "", work_type: "유지보수" });
  const [situationTab, setSituationTab] = useState("사고 현황");
    const [tlEvents, setTlEvents] = useState([
    { time: "14:35", text: "사고 발생", color: "#E24B4A" },
    { time: "14:36", text: "1차 보고 접수", color: "#E24B4A" },
    { time: "14:37", text: "작업중지 재지시 + 대피 요청", color: "#BA7517" },
  ]);
  const [emergencyTab, setEmergencyTab] = useState("유지보수");
  const [emergencySearch, setEmergencySearch] = useState("");
  const [emergencyUsers, setEmergencyUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  // 보고 수신자별 확인 시각 (key: 이름, value: "HH:MM" 또는 null)
  const [reportConfirmed, setReportConfirmed] = useState({
    "김철수 작업자": "14:36",  // 1차 — 이미 접수됨
    "김현당 팀장": null,
    "이인판 차장": null,
    "박관리 부장": null,
    "안전상황실": null,
  });
  // ── 인앱 알림 state ───────────────────────────────────
  const [notifications, setNotifications] = useState([]);   // 미확인 알림 목록
  const [activeNotif, setActiveNotif] = useState(null);      // 현재 표시 중인 알림
  const [notifBanner, setNotifBanner] = useState(null);      // 상단 배너 알림

  const [showMockAlert, setShowMockAlert] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [mockCheck, setMockCheck] = useState({ stop: false, call119: false });
  const [showHospitalInput, setShowHospitalInput] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalSubmitted, setHospitalSubmitted] = useState(false);

  const go = (s) => setScreen(s);
  const goHome = () => {
    if (userRole === "supervisor") go(SCREENS.SUPERVISOR_DASHBOARD);
    else if (userRole === "situation") go(SCREENS.SITUATION_ROOM);
    else go(SCREENS.MAIN);
  };

  // ── Supabase Realtime — 상급자 지시 수신 ──────────────
  useEffect(() => {
    if (userRole !== "worker") return;
    const channel = supabase
      .channel("directives-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "directives" },
        (payload) => {
          const directive = payload.new;

          // 응급조치 병원 입력 요청
          if (directive.action_key === "응급조치_병원입력") {
            setShowHospitalInput(true);
            return;
          }

          const newNotif = {
            id: directive.id,
            title: `상급자 조치 지시`,
            body: `${directive.supervisor_name}이(가) '${directive.action_label}' 지시를 전송했습니다.`,
            message: directive.message,
            actionLabel: directive.action_label,
            supervisorName: directive.supervisor_name,
            sentAt: directive.sent_at,
          };
          setNotifBanner(newNotif);
          setNotifications(prev => [newNotif, ...prev]);
          setTimeout(() => setNotifBanner(null), 5000);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

  // ── Supabase Realtime — 출동 지시 수신 ──
  useEffect(() => {
    const channel = supabase
      .channel("dispatches-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dispatches" },
        (payload) => {
          const d = payload.new;
          const newNotif = {
            id: d.id,
            title: "출동 지시",
            body: d.dispatcher_name + "이(가) 출동합니다." + (d.accident_minutes ? " 사고장소 " + d.accident_minutes + "분" : "") + (d.hospital_minutes ? " / 병원 " + d.hospital_minutes + "분" : ""),
            message: d.dispatcher_name + " 출동 지시됨\n" + (d.accident_minutes ? "사고장소까지: " + d.accident_minutes + "분\n" : "") + (d.hospital_minutes ? "병원까지: " + d.hospital_minutes + "분" : ""),
            actionLabel: "출동 지시",
            supervisorName: "안전 상황실",
            sentAt: d.dispatched_at,
          };
          setNotifBanner(newNotif);
          setNotifications(prev => [newNotif, ...prev]);
          setTimeout(() => setNotifBanner(null), 5000);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Supabase Realtime — 상급자 새 사고 보고 수신 ──────
  useEffect(() => {
    if (userRole !== "supervisor" && userRole !== "situation") return;
    const channel = supabase
      .channel("accident-reports-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "accident_reports" },
        (payload) => {
          const report = payload.new;
          // 사고 목록 자동 갱신
          setAccidentReports(prev => [report, ...prev]);
          const newNotif = {
            id: report.id,
            title: "🚨 새 사고 보고 접수",
            body: `${report.worker_name}이(가) ${report.accident_type} 사고를 보고했습니다.`,
            message: `사고 유형: ${report.accident_type}\n위치: ${report.location}\n업무유형: ${report.work_type}\n부상자: ${report.has_injured ? "있음 ("+report.injured_name+")" : "없음"}`,
            actionLabel: `${report.accident_type} 사고 보고`,
            supervisorName: report.worker_name,
            sentAt: report.created_at,
          };
          setNotifBanner(newNotif);
          setTimeout(() => setNotifBanner(null), 8000);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

  const currentRecipients = RECIPIENTS_BY_TYPE[workType] || RECIPIENTS_BY_TYPE["유지보수"];

  const styles = {
    phone: {
      width: 375,
      minHeight: 812,
      background: "#fff",
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    },
    statusBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 20px 4px",
      fontSize: 13,
      fontWeight: 600,
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 20px",
      borderBottom: "1px solid #f0f0f0",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: "#111",
    },
    backBtn: {
      fontSize: 22,
      color: "#111",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
    },
    cancelBtn: {
      fontSize: 15,
      color: "#666",
      background: "none",
      border: "none",
      cursor: "pointer",
    },
    body: {
      flex: 1,
      padding: "20px",
      overflowY: "auto",
    },
    redBtn: {
      width: "100%",
      padding: "16px",
      background: "#E53E3E",
      color: "#fff",
      border: "none",
      borderRadius: 12,
      fontSize: 17,
      fontWeight: 700,
      cursor: "pointer",
    },
    label: {
      fontSize: 13,
      color: "#888",
      marginBottom: 6,
      display: "block",
    },
  };

  // ── 인앱 알림 배너 + 팝업 렌더 ──────────────────────
  const NotifBanner = () => notifBanner ? (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: 375, zIndex: 9999, padding: "10px 12px 0",
      animation: "slideDown 0.3s ease",
    }}>
      <style>{`@keyframes slideDown{from{transform:translateX(-50%) translateY(-100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{
        background: "#1A365D", borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "#E53E3E",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
          }}>🦺</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{notifBanner.title}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>방금 전</div>
          </div>
          <button onClick={() => setNotifBanner(null)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.5)",
            fontSize: 18, cursor: "pointer", padding: 0,
          }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 10, lineHeight: 1.5 }}>
          {notifBanner.body}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setNotifBanner(null)} style={{
            flex: 1, background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: 7, padding: "7px", fontSize: 11, color: "#fff", cursor: "pointer",
          }}>닫기</button>
          <button onClick={() => { setActiveNotif(notifBanner); setNotifBanner(null); }} style={{
            flex: 2, background: "#E53E3E", border: "none",
            borderRadius: 7, padding: "7px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}>🚨 지시 내용 확인하기</button>
        </div>
      </div>
    </div>
  ) : null;

  const NotifPopup = () => activeNotif ? (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: 375, height: "100%", zIndex: 9998,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "20px", width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "#FFF5F5",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>👔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>상급자 조치 지시</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>
              {activeNotif.supervisorName}
            </div>
          </div>
          <div style={{
            background: "#FFF5F5", border: "1px solid #FED7D7",
            borderRadius: 12, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, color: "#C53030",
          }}>즉시 확인</div>
        </div>

        {/* 지시 내용 */}
        <div style={{
          background: "#FFF5F5", border: "1px solid #FED7D7",
          borderRadius: 10, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C53030", marginBottom: 6 }}>
            🚨 {activeNotif.actionLabel}
          </div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {activeNotif.message}
          </div>
        </div>

        {/* 자동 전송 안내 */}
        <div style={{
          background: "#F0FFF4", border: "1px solid #9AE6B4",
          borderRadius: 8, padding: "10px 12px", marginBottom: 14,
          fontSize: 12, color: "#276749", lineHeight: 1.5,
        }}>
          ✅ 확인 완료 시 상급자에게 자동으로 알림이 전송됩니다.
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setActiveNotif(null)} style={{
            flex: 1, padding: "13px", background: "#fff",
            border: "1.5px solid #ddd", borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#555",
          }}>나중에</button>
          <button onClick={async () => {
            const now = new Date();
            const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
            // DB 확인 완료 처리
            await supabase.from("directives")
              .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
              .eq("id", activeNotif.id);
            // 타임라인에 확인 기록 추가
            setNotifications(prev => prev.map(n =>
              n.id === activeNotif.id ? { ...n, confirmedAt: hhmm } : n
            ));
            setActiveNotif(null);
          }} style={{
            flex: 2, padding: "13px", background: "#E53E3E",
            border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff",
          }}>✓ 확인했습니다</button>
        </div>
      </div>
    </div>
  ) : null;

  const HospitalInputPopup = () => showHospitalInput ? (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: 375, height: "100%", zIndex: 9998,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "22px", width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 4 }}>
            병원 이송 정보 입력
          </div>
          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
            상급자가 응급조치/병원이송을 지시했습니다.<br />이송할 병원 이름을 입력해주세요.
          </div>
        </div>

        {/* 병원 이름 입력 */}
        {!hospitalSubmitted ? (
          <>
            <div style={{
              border: "1.5px solid #E2E8F0", borderRadius: 10,
              padding: "12px 14px", marginBottom: 14, background: "#F7FAFC",
            }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>병원 이름</div>
              <input
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="예: 서산중앙병원"
                style={{
                  width: "100%", border: "none", outline: "none",
                  fontSize: 16, fontWeight: 600, color: "#111",
                  background: "transparent",
                }}
                autoFocus
              />
            </div>

            <button
              onClick={async () => {
                if (!hospitalName.trim()) return;
                // Supabase에 병원 이름 저장
                await supabase.from("directives").insert({
                  accident_id: "2024-0625-001",
                  action_key: "병원이름_입력완료",
                  action_label: "병원 이송 정보",
                  message: `이송 병원: ${hospitalName}`,
                  supervisor_name: "현장 작업자",
                });
                setHospitalSubmitted(true);
              }}
              style={{
                width: "100%", padding: "14px", background: "#E53E3E",
                border: "none", borderRadius: 10, fontSize: 15,
                fontWeight: 700, color: "#fff", cursor: "pointer",
                opacity: hospitalName.trim() ? 1 : 0.4,
              }}
            >확인 — 병원 이름 전송</button>
          </>
        ) : (
          <>
            <div style={{
              background: "#F0FFF4", border: "1px solid #9AE6B4",
              borderRadius: 10, padding: "14px", marginBottom: 14, textAlign: "center",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#276749", marginBottom: 4 }}>
                ✅ 전송 완료
              </div>
              <div style={{ fontSize: 13, color: "#555" }}>
                이송 병원: <strong>{hospitalName}</strong><br />
                상급자와 상황실에 자동 전송됩니다.
              </div>
            </div>
            <button
              onClick={() => { setShowHospitalInput(false); setHospitalSubmitted(false); setHospitalName(""); }}
              style={{
                width: "100%", padding: "13px", background: "#276749",
                border: "none", borderRadius: 10, fontSize: 14,
                fontWeight: 700, color: "#fff", cursor: "pointer",
              }}
            >닫기</button>
          </>
        )}
      </div>
    </div>
  ) : null;

  // ── 화면 00: 로그인 ──────────────────────────────────
  // 전역 알람 오버레이
  const GlobalOverlay = () => (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 99999 }}>
      <div style={{ pointerEvents: "auto" }}>
        <NotifBanner />
        <NotifPopup />
        <HospitalInputPopup />
      </div>
    </div>
  );

  if (screen === SCREENS.LOGIN) {

    const formatPhone = (v) => {
      const digits = v.replace(/\D/g, "").slice(0, 11);
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0,3)}-${digits.slice(3)}`;
      return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
    };

    const handlePhoneChange = (e) => {
      setPhoneNum(formatPhone(e.target.value));
      setPhoneError("");
    };

    const handleSendCode = async () => {
      const digits = phoneNum.replace(/\D/g, "");
      if (digits.length !== 11) {
        setPhoneError("올바른 핸드폰 번호를 입력해주세요.");
        return;
      }
      // Supabase DB에서 번호 조회
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", digits)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setPhoneError("등록되지 않은 번호입니다. 관리자에게 문의하세요.");
        return;
      }
      setPhoneError("");
      setCodeSent(true);
      setLoginStep("verify");
      setVerifyCode("");
    };

    const handleVerify = async () => {
      // 프로토타입: 123456 고정 인증번호 (SMS 연동 후 교체)
      if (verifyCode !== "123456") {
        setVerifyError("인증번호가 일치하지 않습니다. 다시 확인해주세요.");
        return;
      }
      const digits = phoneNum.replace(/\D/g, "");
      // DB에서 사용자 정보 다시 조회
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("phone", digits)
        .single();

      if (!user) {
        setVerifyError("사용자 정보를 불러올 수 없습니다.");
        return;
      }
      setUserRole(user.role);
      if (user.work_type) setWorkType(user.work_type);
      if (user.role === "worker")     go(SCREENS.MAIN);
      if (user.role === "supervisor") go(SCREENS.SUPERVISOR_DASHBOARD);
      if (user.role === "situation")  go(SCREENS.SITUATION_ROOM);
    };

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "28px 24px",
        }}>
          {/* 로고 */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, background: "#E53E3E",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 14px",
              boxShadow: "0 4px 16px rgba(229,62,62,0.3)",
            }}>🦺</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>중대재해 대응 앱</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>안전한 현장을 위한 즉각적인 대응</div>
          </div>

          {/* ── STEP 1: 핸드폰 번호 입력 ── */}
          {loginStep === "phone" && (
            <div style={{ width: "100%" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>
                핸드폰 번호
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
                등록된 번호로 인증번호를 발송해 드립니다.
              </div>

              {/* 번호 입력 필드 */}
              <div style={{
                display: "flex", alignItems: "center",
                border: `1.5px solid ${phoneError ? "#E53E3E" : "#E2E8F0"}`,
                borderRadius: 12, overflow: "hidden", marginBottom: 6,
                background: "#fff",
              }}>
                <div style={{
                  padding: "14px 14px", background: "#F7FAFC",
                  borderRight: "1px solid #E2E8F0",
                  fontSize: 14, color: "#555", fontWeight: 600, flexShrink: 0,
                }}>🇰🇷 +82</div>
                <input
                  type="tel"
                  value={phoneNum}
                  onChange={handlePhoneChange}
                  placeholder="010-0000-0000"
                  style={{
                    flex: 1, padding: "14px 14px", border: "none", outline: "none",
                    fontSize: 16, color: "#111", background: "transparent",
                    letterSpacing: "0.5px",
                  }}
                />
              </div>

              {/* 에러 메시지 */}
              {phoneError && (
                <div style={{ fontSize: 12, color: "#E53E3E", marginBottom: 10, paddingLeft: 2 }}>
                  ⚠️ {phoneError}
                </div>
              )}

              {/* 인증번호 받기 버튼 */}
              <button
                onClick={handleSendCode}
                style={{
                  ...styles.redBtn, marginTop: phoneError ? 4 : 10,
                  fontSize: 16, padding: "15px",
                  boxShadow: "0 4px 12px rgba(229,62,62,0.25)",
                }}
              >인증번호 받기</button>

              {/* 안내 */}
              <div style={{
                marginTop: 20, padding: "14px", background: "#F7FAFC",
                borderRadius: 10, border: "1px solid #E2E8F0",
              }}>
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
                  💡 <strong>처음 사용하시나요?</strong><br />
                  등록되지 않은 번호는 접속이 제한됩니다.<br />
                  안전관리팀에 번호 등록을 요청해주세요.
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: 인증번호 입력 ── */}
          {loginStep === "verify" && (
            <div style={{ width: "100%" }}>
              {/* 뒤로가기 */}
              <button
                onClick={() => { setLoginStep("phone"); setVerifyError(""); setCodeSent(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#888", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >‹ 번호 다시 입력</button>

              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>
                인증번호 입력
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 18, lineHeight: 1.6 }}>
                <span style={{ color: "#E53E3E", fontWeight: 700 }}>{phoneNum}</span> 으로<br />
                6자리 인증번호가 발송되었습니다.
              </div>

              {/* 인증번호 박스 6칸 — 탭하면 키패드 자동 열림 */}
              <div
                onClick={() => document.getElementById("verify-input")?.focus()}
                style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8, cursor: "pointer" }}
              >
                {[0,1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    width: 44, height: 52, borderRadius: 10,
                    border: `2px solid ${
                      verifyError ? "#E53E3E"
                      : verifyCode.length > i ? "#E53E3E"
                      : "#E2E8F0"
                    }`,
                    background: verifyCode.length > i ? "#FFF5F5" : "#F7FAFC",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 800, color: "#E53E3E",
                    transition: "all 0.1s",
                  }}>
                    {verifyCode[i] || ""}
                  </div>
                ))}
              </div>

              {/* 실제 입력 필드 — 보이지 않지만 키패드 열림 */}
              <input
                id="verify-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                autoComplete="one-time-code"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerifyCode(v);
                  setVerifyError("");
                  if (v.length === 6) {
                    setTimeout(async () => {
                      if (v !== "123456") {
                        setVerifyError("인증번호가 일치하지 않습니다.");
                      } else {
                        const digits = phoneNum.replace(/\D/g, "");
                        const { data: user } = await supabase
                          .from("users")
                          .select("*")
                          .eq("phone", digits)
                          .single();
                        if (!user) { setVerifyError("사용자 정보를 불러올 수 없습니다."); return; }
                        setUserRole(user.role);
                        if (user.work_type) setWorkType(user.work_type);
                        if (user.role === "worker")     go(SCREENS.MAIN);
                        if (user.role === "supervisor") go(SCREENS.SUPERVISOR_DASHBOARD);
                        if (user.role === "situation")  go(SCREENS.SITUATION_ROOM);
                      }
                    }, 200);
                  }
                }}
                style={{
                  position: "fixed", top: -200, left: -200,
                  width: 1, height: 1, opacity: 0,
                  fontSize: 16,
                }}
              />

              {/* 에러 */}
              {verifyError && (
                <div style={{
                  fontSize: 12, color: "#E53E3E", textAlign: "center",
                  marginBottom: 10, fontWeight: 600,
                }}>⚠️ {verifyError}</div>
              )}

              {/* 확인 버튼 */}
              <button
                onClick={handleVerify}
                style={{
                  ...styles.redBtn, fontSize: 16, padding: "15px",
                  opacity: verifyCode.length === 6 ? 1 : 0.4,
                  boxShadow: verifyCode.length === 6 ? "0 4px 12px rgba(229,62,62,0.25)" : "none",
                }}
              >확인 →</button>

              {/* 재발송 */}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button
                  onClick={() => { setVerifyCode(""); setVerifyError(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, color: "#888", textDecoration: "underline",
                  }}
                >인증번호 재발송</button>
              </div>

              {/* 프로토타입 안내 */}
              <div style={{
                marginTop: 16, padding: "12px 14px", background: "#FFF5F5",
                borderRadius: 10, border: "1px solid #FED7D7",
              }}>
                <div style={{ fontSize: 12, color: "#C53030", lineHeight: 1.7 }}>
                  🔧 <strong>프로토타입 테스트용</strong><br />
                  인증번호: <strong>123456</strong> (고정)<br />
                  DB 연결 후 실제 문자로 교체됩니다.
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", padding: "0 0 28px", fontSize: 12, color: "#bbb" }}>
          안전은 선택이 아닌 필수입니다.
        </div>
      </div>
    );
  }

  // ── 화면 01: 메인 ──────────────────────────────────────
  if (screen === SCREENS.MAIN) {
    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}>
          <span>9:41</span>
          <span>📶 </span>
        </div>
        <div style={{ textAlign: "center", padding: "20px 20px 0", position: "relative" }}>
          <div style={{ position: "absolute", right: 20, top: 20, fontSize: 22 }}>🔔</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>중대재해 대응 앱</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>안전한 현장을 위한 즉각적인 대응</div>
        </div>
        <div style={{ padding: "24px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 사고 발생 버튼 */}
          <button
            onClick={() => { setIsMock(false); go(SCREENS.ACCIDENT_TYPE); }}
            style={{
              background: "#E53E3E",
              border: "none",
              borderRadius: 16,
              padding: "32px 20px 24px",
              cursor: "pointer",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚨</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>사고 발생</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 16 }}>실제 중대재해 발생 시 사용</div>
            <div style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.2)",
              border: "1.5px solid rgba(255,255,255,0.7)",
              borderRadius: 20,
              padding: "6px 18px",
              fontSize: 13,
              fontWeight: 600,
            }}>3초 안에 보고 시작 가능</div>
          </button>

          {/* 모의훈련 버튼 */}
          <button
            onClick={() => { setIsMock(true); setShowMockAlert(true); }}
            style={{
              background: "#2F855A",
              border: "none",
              borderRadius: 16,
              padding: "32px 20px 24px",
              cursor: "pointer",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>⛑️</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>모의훈련</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>정기 훈련 및 교육용</div>
          </button>

          {/* 모의훈련 알람 팝업 */}
          {showMockAlert && (
            <div style={{
              position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
              width: 375, height: "100%", zIndex: 9999,
              background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px",
            }}>
              <div style={{
                background: "#fff", borderRadius: 20, width: "100%",
                overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}>
                {/* 빨간 헤더 */}
                <div style={{
                  background: "#E53E3E", padding: "24px 20px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🚨</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                    모의훈련 시작
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                    아래 지시사항을 확인하세요
                  </div>
                </div>

                {/* 지시사항 */}
                <div style={{ padding: "20px 20px 8px" }}>

                  {/* 작업 중지 체크 */}
                  <button
                    onClick={() => setMockCheck(prev => ({ ...prev, stop: !prev.stop }))}
                    style={{
                      width: "100%", background: mockCheck.stop ? "#FFF5F5" : "#fff",
                      border: `2px solid ${mockCheck.stop ? "#E53E3E" : "#E2E8F0"}`,
                      borderRadius: 12, padding: "14px", marginBottom: 10,
                      cursor: "pointer", textAlign: "left",
                      display: "flex", gap: 12, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: mockCheck.stop ? "#E53E3E" : "#fff",
                      border: `2px solid ${mockCheck.stop ? "#E53E3E" : "#CBD5E0"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2,
                    }}>
                      {mockCheck.stop && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#C53030", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🚫</span> 즉시 작업 중지
                      </div>
                      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                        현장 내 모든 작업을 즉시 중단하고<br />
                        작업자를 안전한 곳으로 대피시키세요.
                      </div>
                    </div>
                  </button>

                  {/* 119 신고 체크 */}
                  <button
                    onClick={() => setMockCheck(prev => ({ ...prev, call119: !prev.call119 }))}
                    style={{
                      width: "100%", background: mockCheck.call119 ? "#EBF8FF" : "#fff",
                      border: `2px solid ${mockCheck.call119 ? "#2B6CB0" : "#E2E8F0"}`,
                      borderRadius: 12, padding: "14px", marginBottom: 16,
                      cursor: "pointer", textAlign: "left",
                      display: "flex", gap: 12, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: mockCheck.call119 ? "#2B6CB0" : "#fff",
                      border: `2px solid ${mockCheck.call119 ? "#2B6CB0" : "#CBD5E0"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2,
                    }}>
                      {mockCheck.call119 && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#2B6CB0", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🚑</span> 119 즉시 신고
                      </div>
                      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                        119에 신고하고 부상자 여부를<br />
                        확인 후 응급처치를 시행하세요.
                      </div>
                    </div>
                  </button>

                  <div style={{
                    background: "#FFFBEB", border: "1px solid #F6E05E",
                    borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                    fontSize: 12, color: "#744210", lineHeight: 1.6,
                    textAlign: "center",
                  }}>
                    ⚠️ 이것은 <strong>모의훈련</strong>입니다.<br />
                    실제 사고가 아님을 인지하고 훈련에 임해주세요.
                  </div>

                  <button
                    onClick={() => {
                      if (!mockCheck.stop || !mockCheck.call119) return;
                      setShowMockAlert(false);
                      go(SCREENS.ACCIDENT_TYPE);
                    }}
                    style={{
                      width: "100%", padding: "16px", background: (mockCheck.stop && mockCheck.call119) ? "#E53E3E" : "#CBD5E0",
                      border: "none", borderRadius: 12, fontSize: 16,
                      fontWeight: 800, color: "#fff", cursor: (mockCheck.stop && mockCheck.call119) ? "pointer" : "not-allowed",
                      marginBottom: 12,
                      boxShadow: (mockCheck.stop && mockCheck.call119) ? "0 4px 12px rgba(229,62,62,0.35)" : "none",
                    }}
                  >
                    {(mockCheck.stop && mockCheck.call119) ? "확인 — 훈련 시작하기 →" : "위 항목을 모두 확인해주세요"}
                  </button>

                  <button
                    onClick={() => { setIsMock(false); setShowMockAlert(false); setMockCheck({ stop: false, call119: false }); }}
                    style={{
                      width: "100%", padding: "12px", background: "none",
                      border: "none", fontSize: 13, color: "#aaa",
                      cursor: "pointer", marginBottom: 8,
                    }}
                  >취소</button>
                </div>
              </div>
            </div>
          )}

          {/* 긴급 연락처 */}
            <div
              onClick={() => go(SCREENS.EMERGENCY)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#F7F7F7", borderRadius: 12, padding: "12px 16px", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 14, color: "#333" }}>📢 긴급 연락처</span>
              <span style={{ fontSize: 13, color: "#E53E3E", fontWeight: 600 }}>비상 연락망 바로 보기 &gt;</span>
            </div>
        </div>
        <div style={{ textAlign: "center", padding: "0 0 24px", fontSize: 13, color: "#999" }}>
          안전은 선택이 아닌 필수입니다.
        </div>
      </div>
    );
  }

  // ── 화면 02: 사고 유형 선택 ──────────────────────────
  if (screen === SCREENS.ACCIDENT_TYPE) {
    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.MAIN)}>‹</button>
          <span style={styles.headerTitle}>사고 유형 선택</span>
          <button style={styles.cancelBtn} onClick={goHome}>취소</button>
        </div>
        <div style={{ ...styles.body }}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>해당되는 사고 유형을 선택하세요.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {acidentTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.label)}
                style={{
                  background: selectedType === t.label ? "#FFF5F5" : "#FAFAFA",
                  border: `2px solid ${selectedType === t.label ? "#E53E3E" : "#EFEFEF"}`,
                  borderRadius: 12,
                  padding: "20px 12px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{t.label}</div>
              </button>
            ))}
          </div>
          <button style={styles.redBtn} onClick={() => selectedType && go(SCREENS.LOCATION)}
            disabled={!selectedType}>
            다음
          </button>
        </div>
      </div>
    );
  }

  // ── 화면 03: 사고 위치 확인 ──────────────────────────
  if (screen === SCREENS.LOCATION) {

    const KAKAO_KEY = "79643dd3b407eebf29d5139a7c5543de";

    // GPS → 카카오 좌표→주소 변환
    const getGpsLocation = () => {
      setGpsLoading(true);
      setGpsError("");
      setShowAddressSearch(false);
      if (!navigator.geolocation) {
        setGpsError("이 기기에서 위치 서비스를 지원하지 않습니다.");
        setGpsLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setGpsCoords({ lat, lng });
          try {
            const res = await fetch(
              `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
              { headers: { Authorization: `KakaoAK 79643dd3b407eebf29d5139a7c5543de` } }
            );
            const data = await res.json();
            if (data.documents && data.documents.length > 0) {
              const addr = data.documents[0].address;
              setGpsAddress(addr.address_name);
            } else {
              // 카카오 실패 시 nominatim 사용
              const res2 = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`
              );
              const data2 = await res2.json();
              setGpsAddress(data2.display_name || `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`);
            }
          } catch {
            try {
              const res2 = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`
              );
              const data2 = await res2.json();
              setGpsAddress(data2.display_name || `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`);
            } catch {
              setGpsAddress(`위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`);
            }
          }
          setGpsLoading(false);
        },
        (err) => {
          setGpsError("위치 접근이 거부되었습니다. 직접 주소를 입력해주세요.");
          setGpsLoading(false);
          setShowAddressSearch(true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // 주소 검색 (카카오 키워드 검색)
    const searchAddress = async () => {
      if (!addressSearchQuery.trim()) return;
      try {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addressSearchQuery)}`,
          { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
        );
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
          setGpsAddress(doc.address_name || doc.road_address_name);
          setGpsCoords({ lat: parseFloat(doc.y), lng: parseFloat(doc.x) });
          setShowAddressSearch(false);
          setAddressSearchQuery("");
        } else {
          setGpsError("검색 결과가 없습니다. 다시 입력해주세요.");
        }
      } catch {
        setGpsError("주소 검색 중 오류가 발생했습니다.");
      }
    };

    // 화면 진입 시 자동 GPS
    if (!gpsAddress && !gpsLoading && !gpsError) {
      getGpsLocation();
    }

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.ACCIDENT_TYPE)}>‹</button>
          <span style={styles.headerTitle}>사고 위치 확인</span>
          <button style={styles.cancelBtn} onClick={goHome}>취소</button>
        </div>
        <div style={styles.body}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>GPS가 자동으로 위치를 확인합니다.</p>

          {/* 지도 영역 */}
          <div style={{
            background: "#E8F0E8", borderRadius: 12, height: 180,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", marginBottom: 16, overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(0,0,0,0.04) 20px,rgba(0,0,0,0.04) 21px), repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(0,0,0,0.04) 20px,rgba(0,0,0,0.04) 21px)",
            }} />
            {gpsLoading ? (
              <div style={{ zIndex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                <div style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>위치 확인 중...</div>
              </div>
            ) : (
              <div style={{ fontSize: 40, zIndex: 1 }}>📍</div>
            )}
          </div>

          {/* 위치 정보 표시 */}
          {gpsLoading ? (
            <div style={{ textAlign: "center", marginBottom: 16, color: "#888", fontSize: 13 }}>
              GPS 신호를 수신하고 있습니다...
            </div>
          ) : gpsAddress ? (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{gpsAddress}</div>
            </div>
          ) : null}

          {/* 오류 메시지 */}
          {gpsError && !showAddressSearch && (
            <div style={{
              background: "#FFF5F5", border: "1px solid #FED7D7",
              borderRadius: 8, padding: "10px 14px", marginBottom: 12,
              fontSize: 13, color: "#C53030",
            }}>⚠️ {gpsError}</div>
          )}

          {/* 위치 확인 체크 — 주소 있을 때만 */}
          {gpsAddress && !showAddressSearch && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#F0FFF4", border: "1px solid #9AE6B4",
              borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            }}>
              <span style={{ color: "#2F855A", fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 14, color: "#2F855A", fontWeight: 600 }}>위치 정보가 올바릅니까?</span>
            </div>
          )}

          {/* 주소 검색 입력창 */}
          {showAddressSearch && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 8 }}>
                📍 주소 직접 입력
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={addressSearchQuery}
                  onChange={(e) => setAddressSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchAddress()}
                  placeholder="예: 서산시 대산읍 또는 도로명 주소"
                  style={{
                    flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 8,
                    padding: "11px 13px", fontSize: 14, outline: "none",
                  }}
                />
                <button
                  onClick={searchAddress}
                  style={{
                    padding: "11px 16px", background: "#E53E3E", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
                    cursor: "pointer", flexShrink: 0,
                  }}
                >검색</button>
              </div>
              {gpsError && (
                <div style={{ fontSize: 12, color: "#E53E3E", marginTop: 6 }}>{gpsError}</div>
              )}
            </div>
          )}

          {/* 하단 버튼들 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => {
                setShowAddressSearch(true);
                setGpsError("");
              }}
              style={{
                flex: 1, padding: "13px", background: "#fff",
                border: "1.5px solid #ddd", borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#333",
              }}
            >아니요, 다시 설정</button>
            <button
              onClick={() => {
                setGpsAddress("");
                setGpsCoords(null);
                setGpsError("");
                setShowAddressSearch(false);
                getGpsLocation();
              }}
              style={{
                padding: "13px 14px", background: "#EBF8FF",
                border: "1.5px solid #90CDF4", borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#2B6CB0",
              }}
            >🔄 재시도</button>
          </div>

          <button
            style={{
              ...styles.redBtn,
              opacity: gpsAddress ? 1 : 0.4,
              cursor: gpsAddress ? "pointer" : "not-allowed",
            }}
            onClick={() => gpsAddress && go(SCREENS.DETAILS)}
          >다음</button>
        </div>
      </div>
    );
  }

  // ── 화면 04: 사고 내용 입력 ──────────────────────────
  if (screen === SCREENS.DETAILS) {
    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.LOCATION)}>‹</button>
          <span style={styles.headerTitle}>사고 내용 입력</span>
          <button style={styles.cancelBtn} onClick={goHome}>취소</button>
        </div>
        <div style={styles.body}>
          {/* 발생 일시 */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>사고 발생 일시</label>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px",
            }}>
              <span style={{ fontSize: 15, color: "#111" }}>{accidentDate}</span>
              <span style={{ fontSize: 18, color: "#888" }}>🕐</span>
            </div>
          </div>
          {/* 사고 내용 */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>사고 내용 (상세히 입력해주세요)</label>
            <textarea
              value={accidentContent}
              onChange={(e) => setAccidentContent(e.target.value)}
              maxLength={500}
              style={{
                width: "100%", height: 100, border: "1.5px solid #E2E8F0", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, resize: "none", boxSizing: "border-box",
                fontFamily: "inherit", color: "#111",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 12, color: "#aaa", marginTop: 4 }}>
              {accidentContent.length}/500
            </div>
          </div>
          {/* 부상자 유무 */}
          <div style={{ marginBottom: hasInjured ? 16 : 24 }}>
            <label style={styles.label}>부상자 유무</label>
            <div style={{ display: "flex", gap: 24 }}>
              {[{ v: true, l: "있음" }, { v: false, l: "없음" }].map(({ v, l }) => (
                <label key={l} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="radio" checked={hasInjured === v} onChange={() => setHasInjured(v)}
                    style={{ accentColor: "#E53E3E", width: 18, height: 18 }} />
                  <span style={{ fontSize: 15, color: "#111" }}>{l}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 부상자 이름 입력 — '있음' 선택 시만 노출 */}
          {hasInjured && (
            <div style={{
              marginBottom: 24,
              background: "#FFF5F5",
              border: "1.5px solid #FED7D7",
              borderRadius: 10,
              padding: "14px",
              animation: "fadeIn 0.2s ease",
            }}>
              <label style={{ ...styles.label, color: "#C53030" }}>부상자 이름</label>
              <input
                value={injuredName}
                onChange={(e) => setInjuredName(e.target.value)}
                placeholder="부상자 성명을 입력하세요"
                style={{
                  width: "100%", border: "1.5px solid #FCA5A5", borderRadius: 8,
                  padding: "11px 13px", fontSize: 15, boxSizing: "border-box",
                  color: "#111", background: "#fff", outline: "none",
                }}
              />
              <div style={{ fontSize: 12, color: "#E53E3E", marginTop: 6 }}>
                ※ 부상자가 여러 명인 경우 쉼표(,)로 구분해주세요
              </div>
            </div>
          )}
          {/* 작업 정보 — 업무 유형 탭 */}
          <div style={{ marginBottom: 28 }}>
            <label style={styles.label}>작업 정보</label>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: "1.5px solid #E2E8F0" }}>
              {["유지보수", "운용투자"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setWorkType(type);
                    setCheckedRecipients(RECIPIENTS_BY_TYPE[type].map((_, i) => i));
                  }}
                  style={{
                    flex: 1, padding: "13px 0", fontSize: 15, fontWeight: 700,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: workType === type ? "#E53E3E" : "#fff",
                    color: workType === type ? "#fff" : "#888",
                    borderRight: type === "유지보수" ? "1px solid #E2E8F0" : "none",
                  }}
                >
                  {type === "유지보수" ? "🔧 유지보수" : "📈 운용투자"}
                </button>
              ))}
            </div>
            {workType && (
              <div style={{
                marginTop: 8, padding: "8px 12px", background: "#F7FAFC",
                borderRadius: 8, fontSize: 12, color: "#4A5568",
                border: "1px solid #E2E8F0",
              }}>
                {workType === "유지보수"
                  ? "📋 보고 대상: 팀장 → 유지보수 관리자 → 안전관리자 → 상황실"
                  : "📋 보고 대상: 팀장 → 투자사업 담당 → 사업부장 → 안전관리자 → 상황실"}
              </div>
            )}
            {!workType && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#E53E3E" }}>
                ※ 업무 유형을 선택하면 보고 대상이 자동으로 설정됩니다
              </div>
            )}
          </div>
          <button
            style={{ ...styles.redBtn, opacity: workType ? 1 : 0.45, cursor: workType ? "pointer" : "not-allowed" }}
            onClick={() => workType && go(SCREENS.PHOTOS)}
          >다음</button>
        </div>
      </div>
    );
  }

  // ── 화면 05: 사진/동영상 등록 ─────────────────────────
  if (screen === SCREENS.PHOTOS) {

    const handleAddPhoto = (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const newPhotos = files.map(f => ({
        id: Date.now() + Math.random(),
        url: URL.createObjectURL(f),
        name: f.name,
      }));
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      setPhotoError(false);
    };

    const handleRemovePhoto = (id) => {
      setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    const allPhotos = [...uploadedPhotos];
    const canProceed = allPhotos.length >= 1;

    const handleNext = () => {
      if (!canProceed) { setPhotoError(true); return; }
      setPhotoError(false);
      go(SCREENS.RECIPIENTS);
    };

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.DETAILS)}>‹</button>
          <span style={styles.headerTitle}>사진/동영상 등록</span>
          <button style={styles.cancelBtn} onClick={goHome}>취소</button>
        </div>
        <div style={styles.body}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 10 }}>
            사고 현장 사진 또는 동영상을 등록해주세요.
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#FFF5F5", border: "1px solid #FED7D7",
            borderRadius: 6, padding: "5px 10px", marginBottom: 16,
          }}>
            <span style={{ color: "#E53E3E", fontSize: 13 }}>📌</span>
            <span style={{ fontSize: 12, color: "#C53030", fontWeight: 600 }}>최소 1장 이상 등록 필수</span>
          </div>

          {/* 카메라 촬영 버튼 */}
          <label style={{
            display: "block", width: "100%",
            border: `2px dashed ${photoError ? "#E53E3E" : "#ddd"}`,
            borderRadius: 12, padding: "22px",
            textAlign: "center", marginBottom: 12, cursor: "pointer",
            background: photoError ? "#FFF5F5" : "#FAFAFA",
          }}>
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              onChange={handleAddPhoto}
              style={{ display: "none" }}
            />
            <div style={{ fontSize: 34, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 14, color: photoError ? "#E53E3E" : "#666", fontWeight: 600 }}>
              카메라로 촬영하기
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>탭하면 카메라가 바로 열립니다</div>
          </label>

          {/* 갤러리에서 선택 버튼 */}
          <label style={{
            display: "block", width: "100%",
            border: "1.5px solid #ddd", borderRadius: 10,
            padding: "13px", textAlign: "center",
            marginBottom: 14, cursor: "pointer", background: "#fff",
          }}>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleAddPhoto}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>🖼️ 갤러리에서 선택</span>
          </label>

          {/* 에러 메시지 */}
          {photoError && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#FFF5F5", border: "1px solid #FCA5A5",
              borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={{ fontSize: 13, color: "#C53030", fontWeight: 600 }}>
                사진을 1장 이상 등록해야 다음으로 넘어갈 수 있습니다.
              </span>
            </div>
          )}

          {/* 등록된 사진 목록 */}
          {allPhotos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                등록된 사진 <span style={{ color: "#E53E3E", fontWeight: 700 }}>{allPhotos.length}장</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {allPhotos.map((p) => (
                  <div key={p.id} style={{ position: "relative" }}>
                    <img
                      src={p.url}
                      alt={p.name}
                      style={{ width: 100, height: 82, objectFit: "cover", borderRadius: 10 }}
                    />
                    <button
                      onClick={() => handleRemovePhoto(p.id)}
                      style={{
                        position: "absolute", top: -6, right: -6,
                        width: 22, height: 22, borderRadius: "50%",
                        background: "#E53E3E", border: "2px solid #fff",
                        color: "#fff", fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button style={styles.redBtn} onClick={handleNext}>다음</button>
        </div>
      </div>
    );
  }

  // ── 화면 05.5: 긴급 조치 현황 ─────────────────────────
  if (screen === SCREENS.ACTIONS) {
    const ACTION_ITEMS = [
      {
        key: "stop",
        icon: "🚫",
        title: "작업 중지",
        desc: "현장 모든 작업을 즉시 중지했습니까?",
        color: "#C53030",
        subItems: ["작업 중지", "장비 가동 중단", "작업자 대피 완료"],
      },
      {
        key: "report119",
        icon: "🚑",
        title: "119 신고",
        desc: "119에 신고 및 연락했습니까?",
        color: "#2B6CB0",
        subItems: ["119 신고 완료", "응급조치 완료", "구급대 도착"],
      },
      {
        key: "control",
        icon: "🚧",
        title: "현장 통제",
        desc: "사고 구역 출입을 통제했습니까?",
        color: "#B7791F",
        subItems: ["출입 차단선 설치", "외부인 접근 차단", "통제 담당자 배치"],
      },
    ];

    const nowHHMM = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };

    // 세부 항목 체크 토글 — 체크할 때마다 시각 기록, 같은 그룹 전체 체크 시 상위 상태도 "완료"로 자동 갱신
    const toggleSubItem = (itemKey, subIndex) => {
      const id = `${itemKey}-${subIndex}`;
      const willCheck = !subItemChecked[id];
      const hhmm = nowHHMM();

      setSubItemChecked((prev) => ({ ...prev, [id]: willCheck }));
      setSubItemTimes((prev) => ({ ...prev, [id]: willCheck ? hhmm : null }));

      const item = ACTION_ITEMS.find((it) => it.key === itemKey);
      const totalSubs = item.subItems.length;
      const checkedCountAfter = item.subItems.reduce((acc, _, i) => {
        const sid = `${itemKey}-${i}`;
        const willBeChecked = sid === id ? willCheck : !!subItemChecked[sid];
        return acc + (willBeChecked ? 1 : 0);
      }, 0);

      const newStatus = checkedCountAfter === 0 ? "idle" : checkedCountAfter === totalSubs ? "done" : "partial";
      setActionStatus((prev) => ({ ...prev, [itemKey]: newStatus }));
      setActionTimes((prev) => ({ ...prev, [itemKey]: hhmm }));
    };

    const STATUS_OPTIONS = {
      done:    { label: "완료",   bg: "#F0FFF4", border: "#9AE6B4", color: "#2F855A", dot: "#38A169" },
      partial: { label: "진행중", bg: "#FFFBEB", border: "#F6E05E", color: "#B7791F", dot: "#D69E2E" },
      idle:    { label: "미조치", bg: "#F7FAFC", border: "#CBD5E0", color: "#718096", dot: "#A0AEC0" },
    };

    const doneCount = Object.values(actionStatus).filter((v) => v === "done").length;
    const partialCount = Object.values(actionStatus).filter((v) => v === "partial").length;
    const totalCount = ACTION_ITEMS.length;

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.WORKER_TIMELINE)}>‹</button>
          <span style={styles.headerTitle}>긴급 조치 현황 입력</span>
          <button style={styles.cancelBtn} onClick={goHome}>취소</button>
        </div>
        <div style={styles.body}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 6 }}>
            진행한 세부 조치를 각각 체크하세요.
          </p>
          <p style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
            체크할 때마다 시각이 자동 기록되어 보고서에 함께 첨부됩니다.
          </p>

          {/* 진행 요약 바 */}
          <div style={{
            background: "#F7FAFC", borderRadius: 10, padding: "12px 14px",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>조치 항목 현황</span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  완료 {doneCount} · 진행중 {partialCount} · 미조치 {totalCount - doneCount - partialCount}
                </span>
              </div>
              <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${((doneCount + partialCount * 0.5) / totalCount) * 100}%`,
                  background: doneCount === totalCount ? "#38A169" : "#E53E3E",
                  borderRadius: 3, transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          </div>

          {/* 조치 항목 카드들 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {ACTION_ITEMS.map((item) => {
              const st = STATUS_OPTIONS[actionStatus[item.key]];
              return (
                <div key={item.key} style={{
                  border: `1.5px solid ${st.border}`,
                  borderRadius: 12,
                  background: st.bg,
                  overflow: "hidden",
                  transition: "all 0.2s",
                }}>
                  {/* 카드 헤더 — 정보용, 더 이상 클릭 불가 */}
                  <div style={{
                    padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                    borderBottom: `1px solid ${st.border}`,
                  }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>{item.desc}</div>
                    </div>
                    {/* 상태 뱃지 + 시각 */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: "#fff", border: `1.5px solid ${st.border}`,
                        borderRadius: 20, padding: "4px 10px",
                      }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%", background: st.dot,
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.label}</span>
                      </div>
                      {actionTimes[item.key] && (
                        <span style={{ fontSize: 11, color: "#aaa" }}>{actionTimes[item.key]} 최근 확인</span>
                      )}
                    </div>
                  </div>

                  {/* 세부 항목 체크리스트 — 각각 독립적으로 체크 + 시각 표시 */}
                  <div style={{ padding: "10px 16px 12px" }}>
                    {item.subItems.map((sub, si) => {
                      const id = `${item.key}-${si}`;
                      const checked = !!subItemChecked[id];
                      const checkedTime = subItemTimes[id];
                      return (
                        <button
                          key={si}
                          onClick={() => toggleSubItem(item.key, si)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center",
                            justifyContent: "space-between", gap: 8,
                            padding: "9px 6px", background: "none", border: "none",
                            borderBottom: si < item.subItems.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                              background: checked ? item.color : "#fff",
                              border: `1.5px solid ${checked ? item.color : "#CBD5E0"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}>
                              {checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                            </div>
                            <span style={{
                              fontSize: 13.5, color: checked ? "#222" : "#666",
                              fontWeight: checked ? 600 : 400,
                            }}>{sub}</span>
                          </div>
                          {checkedTime && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: item.color,
                              background: `${item.color}14`, borderRadius: 6, padding: "2px 8px",
                              flexShrink: 0,
                            }}>{checkedTime}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 상태 변경 안내 */}
          <div style={{
            background: "#EDF2F7", borderRadius: 8,
            padding: "10px 14px", marginBottom: 24,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
            <span style={{ fontSize: 12, color: "#4A5568", lineHeight: 1.6 }}>
              세부 항목을 하나씩 체크하면 자동으로 <strong>미조치 → 진행중 → 완료</strong>로 상태가 바뀝니다.
              항목별 체크 시각이 모두 기록됩니다.
            </span>
          </div>

          <button style={styles.redBtn} onClick={() => go(SCREENS.WORKER_TIMELINE)}>
            확인 완료 — 보고 현황 보기
          </button>
        </div>
      </div>
    );
  }

  // ── 화면 06: 보고 대상 확인 ──────────────────────────
  if (screen === SCREENS.RECIPIENTS) {
    const toggleRecipient = (i) => {
      setCheckedRecipients((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
      );
    };

    const allChecked = checkedRecipients.length === currentRecipients.length;
    const toggleAll = () => {
      setCheckedRecipients(allChecked ? [] : currentRecipients.map((_, i) => i));
    };

    const canSend = checkedRecipients.length > 0;

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.PHOTOS)}>‹</button>
          <span style={styles.headerTitle}>보고 대상 확인</span>
          <button style={styles.cancelBtn} onClick={goHome}>취소</button>
        </div>
        <div style={styles.body}>
          {/* 업무유형 배지 + 전체선택 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                background: workType === "운용투자" ? "#EBF8FF" : "#F0FFF4",
                color: workType === "운용투자" ? "#2B6CB0" : "#276749",
                border: `1px solid ${workType === "운용투자" ? "#90CDF4" : "#9AE6B4"}`,
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
              }}>{workType === "운용투자" ? "📈 운용투자" : "🔧 유지보수"}</span>
              <span style={{ fontSize: 12, color: "#888" }}>보고 체계</span>
            </div>
            <button
              onClick={toggleAll}
              style={{
                background: allChecked ? "#E53E3E" : "#fff",
                border: `1.5px solid ${allChecked ? "#E53E3E" : "#ddd"}`,
                borderRadius: 8, padding: "5px 12px", fontSize: 13,
                fontWeight: 600, cursor: "pointer",
                color: allChecked ? "#fff" : "#555",
              }}
            >
              {allChecked ? "✓ 전체선택" : "전체선택"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>보고할 대상자를 선택하세요.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {currentRecipients.map((r, i) => {
              const checked = checkedRecipients.includes(i);
              return (
                <div key={i}>
                  <div style={{ fontSize: 12, color: "#aaa", padding: "12px 0 6px", fontWeight: 600 }}>
                    {r.tier}
                  </div>
                  <button
                    onClick={() => toggleRecipient(i)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      justifyContent: "space-between", padding: "12px 10px",
                      borderBottom: "1px solid #F0F0F0", background: checked ? "#FFF5F5" : "#fff",
                      border: "none", borderBottom: "1px solid #F0F0F0",
                      borderRadius: checked ? 8 : 0, cursor: "pointer",
                      transition: "background 0.15s", marginBottom: checked ? 2 : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%",
                        background: checked ? "#FED7D7" : "#F0F0F0",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                      }}>👤</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{r.name}</div>
                        <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{r.phone}</div>
                      </div>
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: `2px solid ${checked ? "#E53E3E" : "#CBD5E0"}`,
                      background: checked ? "#E53E3E" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.15s",
                    }}>
                      {checked && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* 선택 안내 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 14,
            padding: "10px 14px", background: "#F7F7F7", borderRadius: 8,
          }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span style={{ fontSize: 13, color: "#666" }}>
              선택됨 <strong style={{ color: "#E53E3E" }}>{checkedRecipients.length}명</strong> / 전체 {currentRecipients.length}명
            </span>
          </div>

          {!canSend && (
            <div style={{
              marginTop: 10, padding: "10px 14px", background: "#FFF5F5",
              border: "1px solid #FCA5A5", borderRadius: 8,
              fontSize: 13, color: "#C53030", fontWeight: 600,
            }}>⚠️ 최소 1명 이상 선택해야 전송할 수 있습니다.</div>
          )}

          <div style={{ marginTop: 20 }}>
            <button
              style={{
                ...styles.redBtn,
                opacity: canSend ? 1 : 0.4,
                cursor: canSend ? "pointer" : "not-allowed",
              }}
              onClick={async () => {
                if (!canSend) return;
                // Supabase에 사고 보고 저장
                await supabase.from("accident_reports").insert({
                  worker_name: "김철수",
                  accident_type: selectedType,
                  work_type: workType,
                  location: gpsAddress || "위치 정보 없음",
                  content: accidentContent,
                  has_injured: hasInjured,
                  injured_name: injuredName,
                  status: "진행중",
                });
                go(SCREENS.COMPLETE);
              }}
            >전송</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 화면 07: 보고 완료 ──────────────────────────────
  if (screen === SCREENS.COMPLETE) {
    return <CompleteScreen go={go} />;
  }

  // ── 화면 07-B: 현장작업자 보고현황 (타임라인 + 상급자 조치 지시) ─
  if (screen === SCREENS.WORKER_TIMELINE) {

    const SUPERVISOR_ITEMS = [
      { key: "재지시대피", icon: "🚫", color: "#C53030", label: "작업중지 재지시 + 대피 요청" },
      { key: "현장보존",   icon: "🔒", color: "#276749", label: "현장 보존" },
      { key: "병원이송",   icon: "🏥", color: "#6B46C1", label: "병원 이송" },
    ];

    const sentCount = SUPERVISOR_ITEMS.filter(it => directiveSent[it.key]).length;

    // 타임라인 이벤트 조립
    const fixedEvents = [
      {
        time: "14:35", icon: "🚨", color: "#E53E3E",
        title: "사고 발생",
        desc: "옥외 배관 점검 중 난간 파손으로 추락",
        sub: "충청남도 서산시 대산읍 · 부상자 있음",
        pending: false,
      },
      {
        time: "14:36", icon: "📋", color: "#E53E3E",
        title: "1차 보고 완료",
        desc: `${checkedRecipients.length || 4}명에게 전송됨`,
        sub: `${workType || "유지보수"} 보고 체계`,
        pending: false,
      },
    ];

    const ACTION_LABELS = { stop: "작업 중지", report119: "119 신고", control: "현장 통제" };
    const ACTION_ICONS  = { stop: "🚫",      report119: "🚑",      control: "🚧" };
    const ACTION_COLORS = { stop: "#C53030", report119: "#2B6CB0", control: "#B7791F" };
    const SUB_LABELS = {
      stop: ["작업 중지", "장비 가동 중단", "작업자 대피 완료"],
      report119: ["119 신고 완료", "응급조치 완료", "구급대 도착"],
      control: ["출입 차단선 설치", "외부인 접근 차단", "통제 담당자 배치"],
    };

    // 작업자가 체크한 세부 항목들을 시각 순서대로 타임라인 이벤트로 변환
    const workerActionEvents = Object.entries(subItemTimes)
      .filter(([, time]) => time)
      .sort((a, b) => (a[1] || "").localeCompare(b[1] || ""))
      .map(([id, time]) => {
        const [itemKey, subIdxStr] = id.split("-");
        const subIdx = Number(subIdxStr);
        return {
          time,
          icon: ACTION_ICONS[itemKey], color: ACTION_COLORS[itemKey],
          title: `${ACTION_LABELS[itemKey]} — ${SUB_LABELS[itemKey][subIdx]}`,
          desc: "현장 작업자 체크 완료",
          sub: "",
          pending: false,
        };
      });

    const sentDirectives = SUPERVISOR_ITEMS
      .filter(it => directiveSent[it.key])
      .sort((a, b) => (directiveTimes[a.key] || "").localeCompare(directiveTimes[b.key] || ""))
      .map(it => ({
        time: directiveTimes[it.key],
        icon: it.icon, color: it.color,
        title: `상급자 지시 — ${it.label}`,
        desc: "지시 문자 전송 완료",
        sub: "김현당 팀장 발신",
        pending: false,
      }));

    const pendingDirectives = SUPERVISOR_ITEMS
      .filter(it => !directiveSent[it.key])
      .map(it => ({
        time: null, icon: it.icon, color: "#A0AEC0",
        title: `${it.label}`,
        desc: "상급자 지시 대기 중",
        sub: "",
        pending: true,
      }));

    // 작업자가 확인한 지시 알림을 타임라인 이벤트로 변환
    const confirmedNotifs = notifications
      .filter(n => n.confirmedAt)
      .sort((a, b) => (a.confirmedAt || "").localeCompare(b.confirmedAt || ""))
      .map(n => ({
        time: n.confirmedAt,
        icon: "✓", color: "#276749",
        title: `${n.actionLabel} — 확인 완료`,
        desc: "현장 작업자 확인",
        sub: "",
        pending: false,
      }));

    const allEvents = [...fixedEvents, ...workerActionEvents, ...confirmedNotifs, ...sentDirectives, ...pendingDirectives];

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.COMPLETE)}>‹</button>
          <span style={styles.headerTitle}>보고 현황</span>
          <button style={styles.cancelBtn} onClick={goHome}>홈</button>
        </div>
        <div style={styles.body}>

          {/* 보고 완료 요약 */}
          <div style={{
            background: "#F0FFF4", border: "1px solid #9AE6B4",
            borderRadius: 10, padding: "12px 14px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "#E53E3E",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: "#fff", flexShrink: 0,
            }}>✓</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#276749" }}>1차 보고 완료</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                {checkedRecipients.length || 4}명 전송 · {workType || "유지보수"} 보고 체계
              </div>
            </div>
          </div>

          {/* 상급자 조치 진행률 */}
          <div style={{
            background: "#F7FAFC", border: "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px 14px", marginBottom: 18,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>상급자 조치 지시 현황</span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: sentCount === SUPERVISOR_ITEMS.length ? "#276749" : "#E53E3E",
              }}>{sentCount}/{SUPERVISOR_ITEMS.length} 완료</span>
            </div>
            <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, transition: "width 0.4s",
                width: `${(sentCount / SUPERVISOR_ITEMS.length) * 100}%`,
                background: sentCount === SUPERVISOR_ITEMS.length ? "#38A169" : "#E53E3E",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, color: "#888" }}>전송 완료 {sentCount}건</span>
              <span style={{ fontSize: 11, color: "#aaa" }}>대기 중 {SUPERVISOR_ITEMS.length - sentCount}건</span>
            </div>
          </div>

          {/* 타임라인 */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 14 }}>진행 타임라인</div>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 15, top: 16, bottom: 16,
              width: 2, background: "#E2E8F0", zIndex: 0,
            }} />
            {allEvents.map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 18, position: "relative", zIndex: 1 }}>
                {/* 아이콘 */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: ev.pending ? "#F0F4F8" : ev.color,
                  border: `2px solid ${ev.pending ? "#CBD5E0" : ev.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, zIndex: 2, opacity: ev.pending ? 0.45 : 1,
                }}>{ev.icon}</div>
                {/* 카드 */}
                <div style={{
                  flex: 1, paddingTop: 2,
                  background: ev.pending ? "transparent" : "#fff",
                  border: ev.pending ? "none" : `1px solid ${ev.color}22`,
                  borderRadius: ev.pending ? 0 : 10,
                  padding: ev.pending ? "2px 0" : "10px 12px",
                  opacity: ev.pending ? 0.4 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ev.pending ? "#A0AEC0" : "#111" }}>
                      {ev.title}
                    </span>
                    {ev.time
                      ? <span style={{
                          fontSize: 11, fontWeight: 800, color: ev.color,
                          background: `${ev.color}18`, borderRadius: 5, padding: "2px 7px", flexShrink: 0,
                        }}>{ev.time}</span>
                      : <span style={{ fontSize: 11, color: "#CBD5E0", flexShrink: 0 }}>대기 중</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: ev.pending ? "#CBD5E0" : "#666" }}>{ev.desc}</div>
                  {!ev.pending && ev.sub && (
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{ev.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 하단 안내 */}
          {sentCount < SUPERVISOR_ITEMS.length ? (
            <div style={{
              background: "#FFFBEB", border: "1px solid #F6E05E",
              borderRadius: 10, padding: "12px 14px", marginTop: 4,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⏳</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#B7791F", marginBottom: 3 }}>
                  상급자 조치 지시 대기 중
                </div>
                <div style={{ fontSize: 12, color: "#744210", lineHeight: 1.6 }}>
                  상급자가 조치 지시를 완료하면 이 화면에 시각과 함께 표시됩니다.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "#F0FFF4", border: "1px solid #9AE6B4",
              borderRadius: 10, padding: "12px 14px", marginTop: 4,
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#276749" }}>
                모든 상급자 조치 지시가 완료되었습니다.
              </span>
            </div>
          )}

          {/* 추가 조치 입력 버튼 */}
          <button
            onClick={() => go(SCREENS.ACTIONS)}
            style={{
              width: "100%", marginTop: 16, padding: "14px",
              background: "#fff", color: "#E53E3E",
              border: "1.5px solid #E53E3E", borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >🚨 추가로 긴급 조치 현황 입력하기</button>
        </div>
      </div>
    );
  }

  // ── 화면 07-S: 상급자 대시보드 (첫 화면) ────────────
  if (screen === SCREENS.SUPERVISOR_DASHBOARD) {

    // Supabase에서 사고 목록 불러오기
    const loadReports = async () => {
      setReportsLoading(true);
      const { data } = await supabase
        .from("accident_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setAccidentReports(data);
      setReportsLoading(false);
    };

    if (accidentReports.length === 0 && !reportsLoading) loadReports();

    const ACCIDENT_ICONS = { "추락": "🧗", "감전": "⚡", "낙하/비래": "🪨", "화재": "🔥", "끼임": "⚙️", "충돌": "💥" };

    const activeList = accidentReports.filter(a => a.status === "진행중");
    const doneList   = accidentReports.filter(a => a.status === "완료");

    const formatDate = (d) => {
      if (!d) return "-";
      const dt = new Date(d);
      return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
    };

    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>
        <div style={{ ...styles.statusBar, background: "#1A365D", color: "#fff" }}>
          <span>9:41</span><span>📶 </span>
        </div>

        {/* 헤더 */}
        <div style={{
          background: "#1A365D", padding: "14px 20px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>사고 현황</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>
              상급자 모니터링 대시보드
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={loadReports}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none",
                borderRadius: 8, padding: "6px 12px", color: "#fff",
                fontSize: 12, cursor: "pointer",
              }}
            >🔄 새로고침</button>
            <button
              onClick={() => go(SCREENS.LOGIN)}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none",
                borderRadius: 8, padding: "6px 12px", color: "#fff",
                fontSize: 12, cursor: "pointer",
              }}
            >로그아웃</button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: "flex", gap: 10, padding: "14px 16px 0" }}>
          {[
            { label: "전체",   value: accidentReports.length, bg: "#fff",    color: "#111",    border: "#E2E8F0" },
            { label: "진행중", value: activeList.length,       bg: "#FFF5F5", color: "#C53030", border: "#FED7D7" },
            { label: "완료",   value: doneList.length,         bg: "#F0FFF4", color: "#276749", border: "#9AE6B4" },
          ].map(c => (
            <div key={c.label} style={{
              flex: 1, background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* 사고 목록 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px" }}>

          {reportsLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#888", fontSize: 14 }}>
              불러오는 중...
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 10 }}>
                🚨 진행중인 사고
              </div>

              {activeList.length === 0 ? (
                <div style={{
                  background: "#F0FFF4", border: "1px solid #9AE6B4",
                  borderRadius: 10, padding: "20px", textAlign: "center",
                  fontSize: 13, color: "#276749", fontWeight: 600, marginBottom: 16,
                }}>✅ 현재 진행중인 사고가 없습니다.</div>
              ) : (
                activeList.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => go(SCREENS.TIMELINE)}
                    style={{
                      width: "100%", background: "#fff",
                      border: "1.5px solid #FED7D7", borderRadius: 12,
                      padding: "14px", marginBottom: 10, textAlign: "left",
                      cursor: "pointer", boxShadow: "0 2px 8px rgba(229,62,62,0.1)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{ACCIDENT_ICONS[acc.accident_type] || "🚨"}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{acc.accident_type}</span>
                        {acc.has_injured && (
                          <span style={{ background: "#FFF5F5", color: "#E53E3E", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 6, border: "1px solid #FED7D7" }}>
                            부상자 있음
                          </span>
                        )}
                      </div>
                      <span style={{
                        background: "#FFF5F5", color: "#C53030", fontSize: 11,
                        fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                        border: "1px solid #FED7D7",
                      }}>● 진행중</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7 }}>
                      <div>📍 {acc.location}</div>
                      <div>👷 {acc.worker_name} · {acc.work_type}</div>
                      <div>🕐 {formatDate(acc.created_at)}</div>
                    </div>
                  </button>
                ))
              )}

              {/* 완료된 사고 */}
              {doneList.length > 0 && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 10, marginTop: 8 }}>
                    ✅ 완료된 사고
                  </div>
                  {doneList.map(acc => (
                    <div key={acc.id} style={{
                      background: "#fff", border: "1px solid #E2E8F0",
                      borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                      opacity: 0.75,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{ACCIDENT_ICONS[acc.accident_type] || "🚨"}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{acc.accident_type}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>{formatDate(acc.created_at)} · {acc.worker_name}</div>
                          </div>
                        </div>
                        <span style={{
                          background: "#F0FFF4", color: "#276749", fontSize: 11,
                          fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                          border: "1px solid #9AE6B4",
                        }}>✓ 완료</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── 화면 EM: 비상 연락망 ──────────────────────────────
  if (screen === SCREENS.EMERGENCY) {
    const nowHHMM = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };

    // DB에서 사용자 목록 불러오기 (화면 진입 시)
    const loadUsers = async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("is_active", true)
        .order("work_type", { ascending: true })
        .order("name", { ascending: true });
      if (data) setEmergencyUsers(data);
    };

    if (emergencyUsers.length === 0) loadUsers();

    // 이름 검색 자동완성
    const handleSearch = (val) => {
      setEmergencySearch(val);
      if (!val.trim()) { setSearchResults([]); return; }
      const results = emergencyUsers.filter(u =>
        u.name.includes(val.trim())
      );
      setSearchResults(results);
    };

    const ROLE_LABEL = { worker: "현장 작업자", supervisor: "상급자", situation: "상황실" };
    const ROLE_COLOR = { worker: "#E53E3E", supervisor: "#2B6CB0", situation: "#1A365D" };

    const displayUsers = emergencySearch.trim()
      ? searchResults
      : emergencyUsers.filter(u => emergencyTab === "전체" || u.work_type === emergencyTab || (!u.work_type && emergencyTab === "전체"));

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.MAIN)}>‹</button>
          <span style={styles.headerTitle}>비상 연락망</span>
          <span />
        </div>
        <div style={styles.body}>

          {/* 이름 검색 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            border: "1.5px solid #E2E8F0", borderRadius: 12,
            padding: "10px 14px", marginBottom: 14, background: "#fff",
          }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <input
              value={emergencySearch}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="이름 검색 (한 글자도 OK)"
              style={{
                flex: 1, border: "none", outline: "none",
                fontSize: 14, color: "#111", background: "transparent",
              }}
            />
            {emergencySearch && (
              <button
                onClick={() => { setEmergencySearch(""); setSearchResults([]); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18 }}
              >×</button>
            )}
          </div>

          {/* 자동완성 결과 */}
          {emergencySearch.trim() && searchResults.length > 0 && (
            <div style={{
              background: "#fff", border: "1px solid #E2E8F0",
              borderRadius: 10, marginBottom: 12, overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}>
              {searchResults.map((u, i) => (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderBottom: i < searchResults.length - 1 ? "1px solid #F7F7F7" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `${ROLE_COLOR[u.role]}18`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>👤</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
                        {u.team} · {u.position} ·
                        <span style={{ color: ROLE_COLOR[u.role], fontWeight: 600 }}> {ROLE_LABEL[u.role]}</span>
                      </div>
                    </div>
                  </div>
                  <a href={`tel:${u.phone}`} style={{
                    background: "#E53E3E", color: "#fff", border: "none",
                    borderRadius: 8, padding: "6px 12px", fontSize: 12,
                    fontWeight: 700, cursor: "pointer", textDecoration: "none",
                  }}>📞 전화</a>
                </div>
              ))}
            </div>
          )}

          {emergencySearch.trim() && searchResults.length === 0 && (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, marginBottom: 12 }}>
              "{emergencySearch}" 검색 결과가 없습니다.
            </div>
          )}

          {/* 탭 — 검색 중엔 숨김 */}
          {!emergencySearch.trim() && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["전체", "유지보수", "운용투자"].map(tab => (
                  <button key={tab} onClick={() => setEmergencyTab(tab)} style={{
                    padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 600,
                    background: emergencyTab === tab ? "#E53E3E" : "#F7F7F7",
                    color: emergencyTab === tab ? "#fff" : "#888",
                  }}>{tab}</button>
                ))}
              </div>

              {/* 연락망 목록 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {displayUsers.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "20px 0" }}>
                    불러오는 중...
                  </div>
                ) : (
                  displayUsers.map((u, i) => (
                    <div key={u.id} style={{
                      background: "#fff", border: "1px solid #E2E8F0",
                      borderRadius: 10, padding: "12px 14px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: `${ROLE_COLOR[u.role]}18`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                        }}>👤</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{u.name}</span>
                            <span style={{
                              background: `${ROLE_COLOR[u.role]}18`,
                              color: ROLE_COLOR[u.role],
                              fontSize: 10, fontWeight: 700,
                              padding: "1px 6px", borderRadius: 4,
                            }}>{ROLE_LABEL[u.role]}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            {u.team} · {u.position} · {u.phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                          </div>
                          {u.work_type && (
                            <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{u.work_type}</div>
                          )}
                        </div>
                      </div>
                      <a href={`tel:${u.phone}`} style={{
                        background: "#E53E3E", color: "#fff",
                        borderRadius: 8, padding: "7px 12px",
                        fontSize: 12, fontWeight: 700,
                        textDecoration: "none", flexShrink: 0,
                      }}>📞 전화</a>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── 화면 08: 상급자 확인 화면 ────────────────────────
  if (screen === SCREENS.SUPERVISOR) {

    const CHECKLIST_ITEMS = [
      {
        key: "재지시대피",
        label: "작업중지 재지시 + 대피 요청",
        defaultMsg: `[작업중지 재지시 및 대피 요청]\n\n2024.06.25 14:35 발생한 추락 사고와 관련하여\n작업중지를 재지시하고 2차 사고 예방을 위해\n모든 작업자의 즉각적인 대피를 요청합니다.\n\n- 현장 내 모든 작업 즉시 중단\n- 전 작업자 안전지대로 대피\n- 사고 구역 접근 전면 금지\n- 추가 지시 있을 때까지 대기\n\n`,
      },
      {
        key: "현장보존",
        label: "현장 보존",
        defaultMsg: `[현장 보존 지시]\n\n사고 조사를 위한 현장 보존을\n철저히 유지하시기 바랍니다.\n\n- 사고 현장 원형 그대로 보존\n- 장비·자재 이동 금지\n- 사진 및 영상 추가 기록 요망\n- 목격자 확보 및 대기\n\n`,
      },
      {
        key: "병원이송",
        label: "병원 이송",
        defaultMsg: `[병원 이송 지시]\n\n부상자에 대한 즉각적인 응급조치 및\n병원 이송을 지시합니다.\n\n- 현장 응급 처치 즉시 시행\n- 인근 응급실로 신속 이송\n- 이송 병원 및 상태 보고 요망\n\n`,
      },
    ];

    const allDone = Object.values(checklistDone).every(Boolean);

    const handleDirectiveOpen = (key, defaultMsg) => {
      // 처음 열 때 기본 문자 내용 세팅
      if (!directiveTexts[key]) {
        setDirectiveTexts((prev) => ({ ...prev, [key]: defaultMsg }));
      }
      setActiveDirective((prev) => (prev === key ? null : key));
      setDirectiveEditing((prev) => ({ ...prev, [key]: false }));
    };

    const handleSend = async (key) => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      setDirectiveSent((prev) => ({ ...prev, [key]: true }));
      setDirectiveTimes((prev) => ({ ...prev, [key]: hhmm }));
      setChecklistDone((prev) => ({ ...prev, [key]: true }));
      setActiveDirective(null);
      setDirectiveEditing((prev) => ({ ...prev, [key]: false }));

      const item = CHECKLIST_ITEMS.find(it => it.key === key);

      // 응급조치 지시 시 → 작업자에게 병원 이름 입력 요청 알림
      if (key === "병원이송") {
        await supabase.from("directives").insert({
          accident_id: "2024-0625-001",
          action_key: "응급조치_병원입력",
          action_label: "병원 이름 입력 요청",
          message: "이송할 병원 이름을 입력해주세요.",
          supervisor_name: "김현당 팀장",
        });
      }

      // Supabase에 지시 저장 → Realtime으로 현장작업자에게 전달
      await supabase.from("directives").insert({
        accident_id: "2024-0625-001",
        action_key: key,
        action_label: item?.label || key,
        message: directiveTexts[key] || item?.defaultMsg || "",
        supervisor_name: "김현당 팀장",
      });
    };

    return (
      <div style={styles.phone}><GlobalOverlay />
        <div style={styles.statusBar}><span>9:41</span><span>📶 </span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.SUPERVISOR_DASHBOARD)}>‹</button>
          <span style={styles.headerTitle}>사고 상세 정보</span>
          <span />
        </div>
        <div style={{ ...styles.body, padding: "16px" }}>

          {/* 상태 뱃지 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <span style={{ background: "#E53E3E", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>1차 보고</span>
            <span style={{ background: "#FFF5F5", color: "#E53E3E", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #FED7D7" }}>미확인</span>
            <div style={{ marginLeft: "auto" }}><span style={{ fontSize: 18, color: "#888" }}>⤢</span></div>
          </div>

          {/* 사고 정보 */}
          <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px", marginBottom: 14 }}>
            {[["사고 일시","2024.06.25 (화) 14:35"],["사고 장소","충청남도 서산시 대산읍"],["사고 유형","추락"],["사고 내용","옥외 배관 점검 중 난간 파손으로 추락"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 14 }}>
                <span style={{ color: "#888", minWidth: 60, flexShrink: 0 }}>{k}</span>
                <span style={{ color: "#111", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* 첨부 사진 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>첨부 사진</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["#4A5568","🏗️"],["#718096","🏭"]].map(([bg,icon],i) => (
                <div key={i} style={{ width: 90, height: 70, background: bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>{icon}</div>
              ))}
            </div>
          </div>

          {/* ── 조치 지시 체크리스트 ── */}
          <div style={{ background: "#FFF5F5", border: "1px solid #FED7D7", borderRadius: 10, padding: "14px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#C53030" }}>상급자 조치 지시 체크리스트</span>
              <span style={{ fontSize: 12, color: "#888" }}>
                {Object.values(checklistDone).filter(Boolean).length}/{CHECKLIST_ITEMS.length} 완료
              </span>
            </div>

            {CHECKLIST_ITEMS.map((item) => {
              const done = !!checklistDone[item.key];
              const isOpen = activeDirective === item.key;
              const isEditing = directiveEditing[item.key];
              const text = directiveTexts[item.key] || item.defaultMsg;
              const sent = !!directiveSent[item.key];

              return (
                <div key={item.key} style={{ marginBottom: 6 }}>
                  {/* 항목 행 */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0", borderBottom: isOpen ? "none" : "1px solid rgba(229,62,62,0.1)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        background: done ? "#E53E3E" : "#fff",
                        border: `2px solid ${done ? "#E53E3E" : "#FCA5A5"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: done ? "#888" : "#333", textDecoration: done ? "line-through" : "none" }}>
                        {item.label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDirectiveOpen(item.key, item.defaultMsg)}
                      style={{
                        background: done ? "#F0FFF4" : isOpen ? "#E53E3E" : "#fff",
                        border: `1px solid ${done ? "#9AE6B4" : isOpen ? "#E53E3E" : "#FCA5A5"}`,
                        borderRadius: 6, padding: "4px 10px", fontSize: 12,
                        color: done ? "#2F855A" : isOpen ? "#fff" : "#C53030",
                        cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                      }}
                    >
                      {done ? "✓ 완료" : isOpen ? "닫기" : "지시하기"}
                    </button>
                  </div>

                  {/* 지시 문자 패널 — 지시하기 누를 때만 노출 */}
                  {isOpen && (
                    <div style={{
                      background: "#fff", border: "1px solid #FED7D7",
                      borderRadius: "0 0 10px 10px", padding: "14px",
                      marginBottom: 8,
                    }}>
                      {/* 패널 헤더 */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#C53030" }}>✉️ 지시 문자 내용</span>
                        <button
                          onClick={() => setDirectiveEditing((prev) => ({ ...prev, [item.key]: !isEditing }))}
                          style={{
                            background: isEditing ? "#EBF8FF" : "#F7FAFC",
                            border: `1px solid ${isEditing ? "#90CDF4" : "#CBD5E0"}`,
                            borderRadius: 6, padding: "3px 10px", fontSize: 12,
                            color: isEditing ? "#2B6CB0" : "#555", cursor: "pointer", fontWeight: 600,
                          }}
                        >
                          {isEditing ? "완료" : "✏️ 수정"}
                        </button>
                      </div>

                      {/* 문자 내용 — 수정 모드 / 읽기 모드 */}
                      {isEditing ? (
                        <textarea
                          value={text}
                          onChange={(e) => setDirectiveTexts((prev) => ({ ...prev, [item.key]: e.target.value }))}
                          style={{
                            width: "100%", height: 160, border: "1.5px solid #90CDF4",
                            borderRadius: 8, padding: "10px 12px", fontSize: 13,
                            resize: "none", boxSizing: "border-box",
                            fontFamily: "inherit", color: "#111", lineHeight: 1.7,
                            outline: "none", background: "#F7FBFF",
                          }}
                        />
                      ) : (
                        <div style={{
                          background: "#FAFAFA", borderRadius: 8, padding: "10px 12px",
                          fontSize: 13, color: "#333", whiteSpace: "pre-wrap",
                          lineHeight: 1.7, minHeight: 100, border: "1px solid #EDF2F7",
                        }}>
                          {text}
                        </div>
                      )}

                      {/* 수신자 표시 */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginTop: 10, padding: "8px 10px",
                        background: "#F7FAFC", borderRadius: 7,
                      }}>
                        <span style={{ fontSize: 13 }}>👤</span>
                        <span style={{ fontSize: 12, color: "#888" }}>수신자:</span>
                        <span style={{ fontSize: 12, color: "#111", fontWeight: 600 }}>김현당 팀장 (010-1234-5678)</span>
                      </div>

                      {/* 전송 버튼 */}
                      <button
                        onClick={() => handleSend(item.key)}
                        style={{
                          width: "100%", marginTop: 10, padding: "12px",
                          background: "#E53E3E", color: "#fff", border: "none",
                          borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        📨 문자 전송
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {/* ── 보고 현황 버튼 ── */}
          <button
            onClick={() => go(SCREENS.TIMELINE)}
            style={{
              width: "100%", padding: "14px", marginBottom: 20,
              background: "#1A365D", color: "#fff", border: "none",
              borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
             보고 현황 전체 보기
          </button>
        </div>
      </div>
    </div>
    );
  }

  // ── 화면 08-B: 보고 현황 타임라인 ────────────────────
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


  if (screen === SCREENS.SITUATION_ROOM) {
    const MEMBERS = [
      { id: "m1", role: "안전관리자", name: "이인판 차장", phone: "010-2345-6789" },
      { id: "m2", role: "안전관리자", name: "박안전 과장", phone: "010-3456-1234" },
      { id: "m3", role: "공사감독자", name: "김현당 팀장", phone: "010-1234-5678" },
    ];

    const loadSituationReports = async () => {
      const { data } = await supabase
        .from("accident_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setAccidentReports(data);
    };

    const loadStaff = async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("is_active", true)
        .order("role", { ascending: true });
      if (data) setStaffList(data);
    };

    if (accidentReports.length === 0) loadSituationReports();
    if (situationTab === "직원 관리" && staffList.length === 0) loadStaff();

    const nowHHMM = () => {
      const d = new Date();
      return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
    };

    const handleDispatch = async () => {
      if (!selectedMember) return;
      const time = nowHHMM();
      const text = selectedMember.name + " 출동 지시" + (accMin ? " — 사고장소 " + accMin + "분" : "") + (hospMin ? " / 병원 " + hospMin + "분" : "");
      setTlEvents(prev => [...prev, { time, text, color: "#185FA5" }]);
      setDispatchedMembers(prev => ({ ...prev, [selectedMember.id]: true }));
      setSelectedMember(null);
      setAccMin("");
      setHospMin("");
      await supabase.from("dispatches").insert({
        accident_id: "2024-0625-001",
        dispatcher_name: selectedMember.name,
        dispatcher_role: selectedMember.role,
        accident_minutes: accMin ? parseInt(accMin) : null,
        hospital_minutes: hospMin ? parseInt(hospMin) : null,
      });
    };

    const handleAddStaff = async () => {
      if (!newStaff.name || !newStaff.phone) return;
      const { error } = await supabase.from("users").insert({
        name: newStaff.name,
        phone: newStaff.phone.replace(/-/g, ""),
        role: newStaff.role,
        team: newStaff.team,
        position: newStaff.position,
        work_type: newStaff.work_type || null,
        is_active: true,
      });
      if (!error) {
        setNewStaff({ name: "", phone: "", role: "worker", team: "", position: "", work_type: "유지보수" });
        setShowAddStaff(false);
        loadStaff();
      }
    };

    const handleDeleteStaff = async (id) => {
      await supabase.from("users").update({ is_active: false }).eq("id", id);
      loadStaff();
    };

    const ROLE_LABEL = { worker: "현장 작업자", supervisor: "상급자", situation: "상황실" };

    return (
      <div style={{ display: "flex", height: "100vh", fontFamily: "'Apple SD Gothic Neo', sans-serif", background: "#F7F8FC" }}>
        <GlobalOverlay />

        {/* 사이드바 */}
        <div style={{ width: 200, background: "#1A365D", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>안전 상황실</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>SK O&S 중대재해 대응</div>
          </div>
          {["사고 현황", "직원 관리", "사고 이력", "비상 연락망", "보고서 출력", "설정"].map(label => (
            <div key={label} onClick={() => { if(label === "사고 현황" || label === "직원 관리") setSituationTab(label); }} style={{
              padding: "10px 16px", fontSize: 13, cursor: "pointer",
              background: situationTab === label ? "rgba(255,255,255,0.15)" : "none",
              color: situationTab === label ? "#fff" : "rgba(255,255,255,0.6)",
            }}>{label}</div>
          ))}
          <div style={{ marginTop: "auto", padding: "16px" }}>
            <button onClick={() => go(SCREENS.LOGIN)} style={{
              width: "100%", padding: "8px", background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
              color: "#fff", fontSize: 12, cursor: "pointer",
            }}>로그아웃</button>
          </div>
        </div>

        {/* 메인 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* 상단바 */}
          <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
              {situationTab === "직원 관리" ? "직원 관리" : "실시간 사고 현황"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {situationTab === "사고 현황" && (
                <button onClick={loadSituationReports} style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>새로고침</button>
              )}
              {situationTab === "직원 관리" && (
                <button onClick={() => setShowAddStaff(true)} style={{ fontSize: 12, padding: "4px 12px", background: "#E53E3E", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>+ 직원 추가</button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#38A169" }} />
                <span style={{ fontSize: 12, color: "#888" }}>실시간 연결</span>
              </div>
            </div>
          </div>

          {/* 직원 관리 탭 */}
          {situationTab === "직원 관리" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {/* 직원 추가 폼 */}
              {showAddStaff && (
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>직원 추가</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>이름 *</div>
                      <input value={newStaff.name} onChange={e => setNewStaff(p => ({...p, name: e.target.value}))} placeholder="홍길동" style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>핸드폰 번호 *</div>
                      <input value={newStaff.phone} onChange={e => setNewStaff(p => ({...p, phone: e.target.value}))} placeholder="010-0000-0000" style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>역할 *</div>
                      <select value={newStaff.role} onChange={e => setNewStaff(p => ({...p, role: e.target.value}))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13 }}>
                        <option value="worker">현장 작업자</option>
                        <option value="supervisor">상급자</option>
                        <option value="situation">상황실</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>소속팀</div>
                      <input value={newStaff.team} onChange={e => setNewStaff(p => ({...p, team: e.target.value}))} placeholder="충청1팀" style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>업무유형</div>
                      <select value={newStaff.work_type} onChange={e => setNewStaff(p => ({...p, work_type: e.target.value}))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13 }}>
                        <option value="유지보수">유지보수</option>
                        <option value="운용투자">운용투자</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowAddStaff(false)} style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff" }}>취소</button>
                    <button onClick={handleAddStaff} style={{ padding: "8px 16px", background: "#E53E3E", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>저장</button>
                  </div>
                </div>
              )}

              {/* 직원 목록 */}
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F7FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      {["이름", "핸드폰", "역할", "소속팀", "업무유형", "관리"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#888", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>직원을 불러오는 중...</td></tr>
                    ) : (
                      staffList.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #F7F7F7", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111" }}>{s.name}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{s.phone?.replace(/(d{3})(d{4})(d{4})/, "$1-$2-$3")}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                              background: s.role === "worker" ? "#FFF5F5" : s.role === "supervisor" ? "#EBF8FF" : "#F0FFF4",
                              color: s.role === "worker" ? "#C53030" : s.role === "supervisor" ? "#2B6CB0" : "#276749",
                            }}>{ROLE_LABEL[s.role]}</span>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{s.team || "-"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{s.work_type || "-"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <button onClick={() => handleDeleteStaff(s.id)} style={{ fontSize: 11, padding: "3px 10px", background: "#FFF5F5", color: "#C53030", border: "1px solid #FED7D7", borderRadius: 6, cursor: "pointer" }}>비활성화</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 사고 현황 탭 */}
          {situationTab === "사고 현황" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* 사고 목록 */}
              <div style={{ width: 260, background: "#fff", borderRight: "1px solid #E2E8F0", overflowY: "auto", flexShrink: 0 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>사고 목록</span>
                </div>
                {accidentReports.length === 0 ? (
                  <div style={{ padding: "20px 14px", fontSize: 13, color: "#aaa", textAlign: "center" }}>사고 없음</div>
                ) : (
                  accidentReports.map(acc => (
                    <div key={acc.id} onClick={() => setSelectedAccident(acc)} style={{
                      padding: "12px 14px", borderBottom: "1px solid #E2E8F0", cursor: "pointer",
                      background: selectedAccident?.id === acc.id ? "#EBF8FF" : "#fff",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{acc.accident_type} 사고</span>
                        <span style={{ background: "#FFF5F5", color: "#C53030", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: "1px solid #FED7D7" }}>진행중</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                        {acc.team || "충청1팀"} · {acc.worker_name} · {acc.work_type}<br />{acc.location}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 상세 패널 */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* 출동 지정 */}
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>출동 지정</div>
                  {["안전관리자", "공사감독자"].map(role => (
                    <div key={role}>
                      <div style={{ fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 6 }}>{role}</div>
                      {MEMBERS.filter(m => m.role === role).map(m => (
                        <div key={m.id} onClick={() => !dispatchedMembers[m.id] && setSelectedMember(m)} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 10px", borderRadius: 8, cursor: dispatchedMembers[m.id] ? "default" : "pointer",
                          border: "1px solid " + (selectedMember?.id === m.id ? "#2B6CB0" : dispatchedMembers[m.id] ? "#9AE6B4" : "#E2E8F0"),
                          background: selectedMember?.id === m.id ? "#EBF8FF" : dispatchedMembers[m.id] ? "#F0FFF4" : "#fff",
                          marginBottom: 6,
                        }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>{m.role} · {m.phone}</div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: dispatchedMembers[m.id] ? "#276749" : selectedMember?.id === m.id ? "#2B6CB0" : "#aaa" }}>
                            {dispatchedMembers[m.id] ? "출동중" : selectedMember?.id === m.id ? "선택됨" : "클릭하여 선택"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {selectedMember && (
                    <div style={{ marginTop: 10, padding: 12, background: "#EBF8FF", borderRadius: 8, border: "1px solid #90CDF4" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#2B6CB0", marginBottom: 10 }}>{selectedMember.name} 출동 설정</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#555", minWidth: 90 }}>사고 장소까지</span>
                          <input type="number" value={accMin} onChange={e => setAccMin(e.target.value)} placeholder="분" style={{ width: 60, padding: "4px 8px", border: "1px solid #90CDF4", borderRadius: 6, fontSize: 13, textAlign: "center" }} />
                          <span style={{ fontSize: 12, color: "#555" }}>분 소요</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#555", minWidth: 90 }}>병원까지</span>
                          <input type="number" value={hospMin} onChange={e => setHospMin(e.target.value)} placeholder="분" style={{ width: 60, padding: "4px 8px", border: "1px solid #90CDF4", borderRadius: 6, fontSize: 13, textAlign: "center" }} />
                          <span style={{ fontSize: 12, color: "#555" }}>분 소요</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => { setSelectedMember(null); setAccMin(""); setHospMin(""); }} style={{ flex: 1, padding: "8px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>취소</button>
                        <button onClick={handleDispatch} style={{ flex: 2, padding: "8px", background: "#2B6CB0", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>출동 지시 확정</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 타임라인 */}
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>진행 타임라인</div>
                  {tlEvents.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>아직 기록 없음</div>
                  ) : (
                    tlEvents.map((ev, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#2B6CB0", marginRight: 6 }}>{ev.time}</span>
                          <span style={{ fontSize: 12, color: "#111" }}>{ev.text}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 상황 종료 버튼 */}
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                <button
                  onClick={async () => {
                    if(!window.confirm("상황을 종료하시겠습니까?")) return;
                    await supabase.from("directives").insert({
                      accident_id: "2024-0625-001",
                      action_key: "상황종료",
                      action_label: "상황 종료",
                      message: "모든 조치가 완료되었습니다. 상황을 종료합니다.",
                      supervisor_name: "안전 상황실",
                    });
                  }}
                  style={{
                    width: "100%", padding: "14px", background: "#1A365D",
                    border: "none", borderRadius: 10, fontSize: 14,
                    fontWeight: 700, color: "#fff", cursor: "pointer",
                  }}
                >상황 종료</button>
              </div>

            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === SCREENS.SITUATION_DETAIL && selectedAccident) {
    const acc = selectedAccident;
    const DIRECTIVE_META = [
      { key: "재지시대피", icon: "🚫", label: "작업중지 재지시 + 대피 요청", color: "#C53030" },
      { key: "현장보존",   icon: "🔒", label: "현장 보존",                   color: "#276749" },
      { key: "병원이송",   icon: "🏥", label: "병원 이송",                   color: "#6B46C1" },
    ];
    const directiveDone = Object.values(acc.directives).filter(Boolean).length;

    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>
        <div style={{ ...styles.statusBar, background: "#fff" }}><span>9:41</span><span>📶 </span></div>

        {/* 헤더 */}
        <div style={{
          background: "#1A365D", padding: "12px 16px 14px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button onClick={() => go(SCREENS.SITUATION_ROOM)} style={{
            background: "none", border: "none", color: "#fff",
            fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1,
          }}>‹</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              {acc.icon} {acc.type} 사고 상세
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>{acc.id}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{
              background: acc.status === "진행중" ? "#E53E3E" : "#38A169",
              color: "#fff", fontSize: 11, fontWeight: 700,
              padding: "3px 10px", borderRadius: 12,
            }}>{acc.status}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>

          {/* 사고 기본 정보 */}
          <div style={{
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: "14px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>📌 사고 기본 정보</div>
            {[
              ["발생 일시", acc.occurredAt],
              ["사고 장소", acc.location],
              ["사고 유형", acc.type],
              ["현장 작업자", acc.worker],
              ["소속팀", acc.team],
              ["업무유형", acc.workType],
              ["부상자", acc.injured ? "있음" : "없음"],
              ["보고 단계", acc.reportStep],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: "flex", gap: 10, padding: "5px 0",
                borderBottom: "1px solid #F7F7F7", fontSize: 13,
              }}>
                <span style={{ color: "#888", minWidth: 70, flexShrink: 0 }}>{k}</span>
                <span style={{ color: "#111", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* 조치 지시 현황 */}
          <div style={{
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: "14px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>🚨 조치 지시 현황</span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: directiveDone === 5 ? "#276749" : "#E53E3E",
              }}>{directiveDone}/5 완료</span>
            </div>

            {/* 진행 바 */}
            <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${(directiveDone / 5) * 100}%`,
                background: directiveDone === 5 ? "#38A169" : "#E53E3E",
                transition: "width 0.4s",
              }} />
            </div>

            {DIRECTIVE_META.map(d => {
              const done = acc.directives[d.key];
              return (
                <div key={d.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid #F7F7F7",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{d.icon}</span>
                    <span style={{ fontSize: 13, color: done ? "#333" : "#aaa" }}>{d.label}</span>
                  </div>
                  <div style={{
                    background: done ? "#F0FFF4" : "#F7FAFC",
                    border: `1px solid ${done ? "#9AE6B4" : "#E2E8F0"}`,
                    borderRadius: 12, padding: "2px 10px",
                    fontSize: 11, fontWeight: 700,
                    color: done ? "#276749" : "#A0AEC0",
                  }}>{done ? "완료" : "미조치"}</div>
                </div>
              );
            })}
          </div>

          {/* 진행 타임라인 */}
          <div style={{
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: "14px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 14 }}>📋 진행 타임라인</div>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 14, top: 16, bottom: 16,
                width: 2, background: "#E2E8F0", zIndex: 0,
              }} />
              {acc.timeline.map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, position: "relative", zIndex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: ev.color, border: `2px solid ${ev.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#fff", fontWeight: 700, zIndex: 2,
                  }}>✓</div>
                  <div style={{
                    flex: 1, background: "#fff", border: `1px solid ${ev.color}22`,
                    borderRadius: 9, padding: "8px 11px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{ev.event}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: ev.color,
                        background: `${ev.color}18`, borderRadius: 5, padding: "2px 7px",
                      }}>{ev.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#666" }}>{ev.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 출동자 지정 */}
          {(() => {
            const DISPATCH_MEMBERS = [
              { key: "safety1", role: "안전관리팀장",   name: "이인판 차장", phone: "010-2345-6789", avatar: "🦺" },
              { key: "safety2", role: "안전관리 담당",   name: "박안전 과장", phone: "010-3456-1234", avatar: "🦺" },
              { key: "safety3", role: "안전관리 담당",   name: "최현장 대리", phone: "010-5678-9012", avatar: "🦺" },
              { key: "super1",  role: "현장책임자",      name: "김현당 팀장", phone: "010-1234-5678", avatar: "👔" },
            ];

            const nowHHMM = () => {
              const d = new Date();
              return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
            };

            const handleDispatch = (key) => {
              if (dispatchState[key]) return;
              setDispatchState(prev => ({ ...prev, [key]: nowHHMM() }));
            };

            const dispatchedCount = Object.keys(dispatchState).length;

            return (
              <div style={{
                background: "#fff", border: "1px solid #E2E8F0",
                borderRadius: 12, padding: "14px", marginBottom: 12,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>🚒 출동 지정</span>
                  {dispatchedCount > 0 && (
                    <span style={{
                      background: "#FFF5F5", border: "1px solid #FED7D7",
                      borderRadius: 12, padding: "2px 10px",
                      fontSize: 11, fontWeight: 700, color: "#C53030",
                    }}>출동 {dispatchedCount}명</span>
                  )}
                </div>

                {DISPATCH_MEMBERS.map((person, i) => {
                  const time = dispatchState[person.key];
                  const isLast = i === DISPATCH_MEMBERS.length - 1;
                  return (
                    <div key={person.key} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 0", borderBottom: isLast ? "none" : "1px solid #F7F7F7",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: time ? "#FFF5F5" : "#F0F4F8",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                        }}>{person.avatar}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{person.name}</div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
                            {person.role} · {person.phone}
                          </div>
                          {time && (
                            <div style={{ fontSize: 11, color: "#E53E3E", fontWeight: 700, marginTop: 2 }}>
                              🚒 {time} 출동 지시됨
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDispatch(person.key)}
                        style={{
                          background: time ? "#F0FFF4" : "#E53E3E",
                          border: `1px solid ${time ? "#9AE6B4" : "#E53E3E"}`,
                          borderRadius: 8, padding: "6px 12px",
                          fontSize: 12, fontWeight: 700,
                          cursor: time ? "default" : "pointer",
                          color: time ? "#276749" : "#fff",
                          flexShrink: 0,
                        }}
                      >{time ? "✓ 출동중" : "출동 지시"}</button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 상황실 액션 버튼 */}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              flex: 1, padding: "12px", background: "#1A365D", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>📞 담당자 연락</button>
            <button style={{
              flex: 1, padding: "12px", background: "#fff", color: "#E53E3E",
              border: "1.5px solid #E53E3E", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}> 보고서 출력</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 화면 SMS ────────────────────────────────────────
  if (screen === SCREENS.SMS) {
    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>
        <div style={{ ...styles.statusBar, background: "#fff" }}><span>9:41</span><span>📶 </span></div>
        <div style={{
          background: "#fff", padding: "16px 20px 12px",
          borderBottom: "1px solid #EFEFEF", textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>사간대별 보고 / 문자 알림 예시</div>
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {smsMessages.map((msg, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: 12, padding: "14px",
                border: `2px solid ${msg.color}22`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <div style={{
                  background: msg.color, color: "#fff", fontSize: 11, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 5, marginBottom: 6, display: "inline-block",
                }}>{msg.step}</div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>
                  {msg.from}  {msg.time}
                </div>
                <div style={{ fontSize: 11, color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            background: "#fff", borderRadius: 12, padding: "14px",
            border: "1px solid #E2E8F0", textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#4A5568", marginBottom: 4 }}>
              📢  SMS, 카카오톡, 이메일 등 다양한 채널로 자동 발송 가능합니다.
            </div>
            <div style={{ fontSize: 12, color: "#aaa" }}>
              ※ 수신자 설정에 따라 알림 채널이 달라질 수 있습니다.
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 16px 24px" }}>
          <button style={styles.redBtn} onClick={goHome}>홈으로 이동</button>
        </div>
      </div>
    );
  }

  // 알림 배너/팝업은 모든 화면 위에 표시
  return (
    <>
      <NotifBanner />
      <NotifPopup />
    </>
  );
}


import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
// docx는 npm 번들링 시 CRA 개발서버에서 export가 undefined로 깨지는 문제가 있어
// public/index.html에서 공식 브라우저용(IIFE) 빌드를 <script>로 로드하고 window.docx로 사용한다.

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
// ── 상급자 지시(action_key)별 작업자 긴급 조치 체크리스트 ──
// 알림 팝업과 '긴급 조치 현황 입력' 화면이 이 설정을 함께 사용해서 항상 같은 항목을 보여준다.
// ── 설정(PIN 관리) 진입용 관리자 비밀번호 — 필요 시 이 값만 바꾸면 됨 ──
const ADMIN_SETTINGS_PASSWORD = "ons1234";

const DIRECTIVE_CHECKLIST = {
  "재지시대피": { itemKey: "stop",      icon: "🚫", title: "작업 중지", question: "현장 모든 작업을 즉시 중지했습니까?", color: "#C53030", subItems: ["작업 중지", "장비 가동 중단", "작업자 대피 완료"] },
  "병원이송":   { itemKey: "report119", icon: "🚑", title: "119 신고", question: "119에 신고 및 연락했습니까?", color: "#2B6CB0", subItems: ["119 신고 완료", "응급조치 완료"] },
  "현장보존":   { itemKey: "control",   icon: "🚧", title: "현장 통제", question: "사고 구역 출입을 통제했습니까?", color: "#B7791F", subItems: ["외부인 접근 차단"] },
};

// ── 사고보고서(.docx) 생성용 헬퍼 ──────────────────────────
const DOCX_PAGE_WIDTH = 11906; // A4, DXA
const DOCX_MARGIN = 1000;
const DOCX_CONTENT_WIDTH = DOCX_PAGE_WIDTH - DOCX_MARGIN * 2;
const DOCX_NAVY = "1A365D";
const DOCX_RED = "C53030";
const DOCX_GREEN = "276749";
const DOCX_GRAY_BG = "F2F2F2";
const DOCX_BORDER = { style: "single", size: 4, color: "999999" };
const DOCX_CELL_BORDERS = { top: DOCX_BORDER, bottom: DOCX_BORDER, left: DOCX_BORDER, right: DOCX_BORDER };

function docxLabelCell(text, width, colSpan) {
  return new window.docx.TableCell({
    width: { size: width, type: "dxa" },
    shading: { type: "clear", fill: DOCX_GRAY_BG },
    verticalAlign: "center",
    borders: DOCX_CELL_BORDERS,
    columnSpan: colSpan || 1,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new window.docx.Paragraph({ children: [new window.docx.TextRun({ text, bold: true, size: 19, font: "맑은 고딕" })] })],
  });
}
function docxValueCell(text, width, opts = {}) {
  return new window.docx.TableCell({
    width: { size: width, type: "dxa" },
    verticalAlign: "center",
    borders: DOCX_CELL_BORDERS,
    columnSpan: opts.colSpan || 1,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new window.docx.Paragraph({
      children: [new window.docx.TextRun({ text: text || "-", size: 19, font: "맑은 고딕", color: opts.color, bold: opts.bold })],
    })],
  });
}
function docxSectionHeading(num, title) {
  return new window.docx.Paragraph({
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: "single", size: 6, color: DOCX_NAVY, space: 4 } },
    children: [new window.docx.TextRun({ text: `${num}. ${title}`, bold: true, size: 24, color: DOCX_NAVY, font: "맑은 고딕" })],
  });
}
function docxBodyText(text, opts = {}) {
  return new window.docx.Paragraph({
    spacing: { after: 100 },
    children: [new window.docx.TextRun({ text, size: 19, font: "맑은 고딕", color: opts.color, bold: opts.bold })],
  });
}

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
function CompleteScreen({ go, GlobalOverlay }) {
  return (
    <div style={{
      width: "100%", maxWidth: 375, minHeight: "100vh",
      background: "#fff", display: "flex", flexDirection: "column",
      fontFamily: "'Apple SD Gothic Neo', sans-serif",
      position: "relative",
    }}>
      {GlobalOverlay && GlobalOverlay()}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: "#E53E3E",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff", marginBottom: 20,
        }}>✓</div>
        <div style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 1.6, marginBottom: 32 }}>
          보고 내용이 등록되었으며,<br />지정된 대상자에게 전송되었습니다.
        </div>
        <button
          onClick={() => go(SCREENS.WORKER_TIMELINE)}
          style={{
            width: "100%", padding: "14px", background: "#1A365D",
            border: "none", borderRadius: 10, fontSize: 14,
            fontWeight: 700, color: "#fff", cursor: "pointer", marginBottom: 10,
          }}
        > 보고 현황 보기</button>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [userRole, setUserRole] = useState(null);
  const [workType, setWorkType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // 로그인한 사용자 정보 (이름, 소속팀 등)
  const [currentAccidentId, setCurrentAccidentId] = useState(null); // 현재(내가 보고한) 사고의 실제 DB id
  const [reportedAt, setReportedAt] = useState(null); // 1차 보고 접수 시각
  const [tlLoadedFor, setTlLoadedFor] = useState(undefined); // 진행 타임라인을 마지막으로 불러온 사고 id
  const [directiveStatus, setDirectiveStatus] = useState({}); // 3대 체크리스트(재지시대피/현장보존/병원이송) DB 기준 전송·확인 상태
  const [staffTeamMap, setStaffTeamMap] = useState({}); // 작업자 이름 → 소속팀 (accident_reports에는 team 컬럼이 없어 users 테이블에서 조회)

  // ── 로그인 state ──────────────────────────────────────
  const [loginStep, setLoginStep] = useState("phone");   // "phone" | "verify"
  const [phoneNum, setPhoneNum] = useState("");
  const [verifyCode, setVerifyCode] = useState(""); // 이제 SMS 인증번호가 아니라 PIN 번호로 사용
  const [pendingLoginUser, setPendingLoginUser] = useState(null); // 전화번호 확인 후 PIN 검증 대기 중인 사용자
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
  const [lightboxUrl, setLightboxUrl] = useState(null); // 사진 확대보기
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
  const [editingStaffId, setEditingStaffId] = useState(null); // null=신규추가, 값 있으면 해당 직원 수정 모드
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "worker", team: "", work_type: "유지보수" });
  const [situationTab, setSituationTab] = useState("사고 현황");
    const [tlEvents, setTlEvents] = useState([]);
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
  const [hospitalName, setHospitalName] = useState(""); // 이송 병원 이름 — 보고현황 화면에서 언제든 입력/수정
  const [situationShareType, setSituationShareType] = useState(null); // null | "TBM확인공유" | "피재자상태공유" | "추가공유"
  const [dispatchTeamFilter, setDispatchTeamFilter] = useState("전체"); // 출동 지정 목록 팀별 필터
  const [collapsedStaffTeams, setCollapsedStaffTeams] = useState({}); // 직원 관리 목록 - 팀별 접기/펼치기
  const [selectedHistoryIds, setSelectedHistoryIds] = useState({}); // 사고 이력 - 체크박스로 선택된 항목들
  const [selectedReportIds, setSelectedReportIds] = useState({}); // 보고서 출력 탭 - 체크박스로 선택된 항목들
  const [workerHomeFilter, setWorkerHomeFilter] = useState("진행중"); // 작업자 홈 사고현황 - 전체/진행중/완료 필터
  const [bulkReportProgress, setBulkReportProgress] = useState(null); // { current, total } | null
  const [pinIssueResults, setPinIssueResults] = useState([]); // 설정 화면 - 방금 발급/초기화된 PIN 목록 (이름/전화번호/PIN)
  const [settingsUnlocked, setSettingsUnlocked] = useState(false); // 설정(PIN 관리) 잠금 해제 여부 - 세션에서만 유지
  const [settingsPasswordInput, setSettingsPasswordInput] = useState("");
  const [settingsPasswordError, setSettingsPasswordError] = useState("");
  const [resetPinTargetId, setResetPinTargetId] = useState(""); // 설정 화면에서 개별 PIN 초기화 대상 직원 id
  const [resetPinSearch, setResetPinSearch] = useState(""); // 개별 PIN 초기화 - 이름 검색어
  const [resetPinDropdownOpen, setResetPinDropdownOpen] = useState(false);
  const [manualPinInput, setManualPinInput] = useState(""); // 개별 직원에게 직접 지정할 PIN
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelUploadResults, setExcelUploadResults] = useState(null); // { success, skipped, failed } 배열들
  const [pinExcelUploading, setPinExcelUploading] = useState(false);
  const [pinExcelResults, setPinExcelResults] = useState(null); // { success, skipped, failed } 배열들
  const [situationShareText, setSituationShareText] = useState("");
  const [situationSharePhoto, setSituationSharePhoto] = useState(null); // { file, previewUrl }
  const [situationShareSending, setSituationShareSending] = useState(false);

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

          const SITUATION_SHARE_LABELS = { "TBM확인공유": "TBM 등록 현황 확인", "피재자상태공유": "피재자 상태 확인", "추가공유": "추가 공유" };
          if (SITUATION_SHARE_LABELS[directive.action_key]) {
            const shareNotif = {
              id: directive.id,
              title: `안전 상황실 — ${SITUATION_SHARE_LABELS[directive.action_key]}`,
              body: directive.message || "내용을 확인해주세요.",
              message: directive.message,
              actionLabel: SITUATION_SHARE_LABELS[directive.action_key],
              supervisorName: directive.supervisor_name || "안전 상황실",
              sentAt: directive.sent_at,
            };
            setNotifBanner(shareNotif);
            setNotifications(prev => [shareNotif, ...prev]);
            setTimeout(() => setNotifBanner(null), 6000);
            return;
          }

          if (directive.action_key === "병원이름_입력완료") {
            const hospNotif = {
              id: directive.id,
              title: "병원 이송 정보 접수",
              body: directive.message,
              message: directive.message,
              actionLabel: "병원 이송 정보",
              supervisorName: directive.supervisor_name,
              sentAt: directive.sent_at,
            };
            setNotifBanner(hospNotif);
            setTimeout(() => setNotifBanner(null), 5000);
            return;
          }

          const newNotif = {
            id: directive.id,
            title: (directive.supervisor_name && directive.supervisor_name.includes("상황실")) ? "상황실 지시" : "상급자 조치 지시",
            body: `${directive.supervisor_name}이(가) '${directive.action_label}' 지시를 전송했습니다.`,
            message: directive.message,
            actionLabel: directive.action_label,
            actionKey: directive.action_key,
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

  // ── Supabase Realtime — 상황 종료 안내(작업자·상급자 공통) ──
  // 초록 계열 전용 팝업으로 안내하고, 확인(또는 4초 후 자동)으로 각자의 홈 화면으로 이동
  useEffect(() => {
    if (userRole !== "worker" && userRole !== "supervisor") return;
    const channel = supabase
      .channel("situation-close-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "directives" },
        (payload) => {
          const directive = payload.new;
          if (directive.action_key !== "상황종료") return;
          const closeNotif = {
            id: directive.id,
            title: "중대재해 대응 상황 종료 안내",
            body: "본 사고에 대한 모든 조치가 완료되어 상황을 종료합니다. 안전한 대응에 협조해 주셔서 감사합니다.",
            message: "본 사고에 대한 모든 조치가 완료되어 상황을 종료합니다. 안전한 대응에 협조해 주셔서 감사합니다.",
            actionLabel: "상황 종료",
            supervisorName: "안전 상황실",
            sentAt: directive.sent_at,
            isClose: true,
          };
          setActiveNotif(closeNotif);
          // 몇 초 뒤 자동으로 각자의 홈 화면으로 이동 (직접 '확인'을 눌러도 바로 이동)
          setTimeout(() => {
            setActiveNotif(prev => (prev && prev.id === closeNotif.id ? null : prev));
            goHome();
          }, 4000);
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
          // 타임라인 캐시 무효화 — 다음에 볼 때 이 출동 지시가 반영되도록
          setTlLoadedFor((prev) => (prev === d.accident_id ? null : prev));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Supabase Realtime — 병원 이송 정보 입력(작업자→상급자) 실시간 수신 ──
  // 작업자가 병원 이름을 입력하면 상급자 화면에 알람 배너를 띄우고 타임라인도 자동 반영
  useEffect(() => {
    if (userRole !== "supervisor" && userRole !== "situation") return;
    const channel = supabase
      .channel("hospital-info-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "directives" },
        (payload) => {
          const d = payload.new;
          if (d.action_key !== "병원이름_입력완료") return;
          const hospNotif = {
            id: d.id,
            title: "🏥 병원 이송 정보 접수",
            body: d.message,
            message: d.message,
            actionLabel: "병원 이송 정보",
            supervisorName: "현장 작업자",
            sentAt: d.sent_at,
          };
          setNotifBanner(hospNotif);
          setTimeout(() => setNotifBanner(null), 6000);
          // 지금 보고 있는 타임라인이 이 사고 건이면 캐시를 무효화해서 자동으로 다시 불러오게 함
          setTlLoadedFor((prev) => (prev === d.accident_id ? null : prev));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

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

  // ── Supabase Realtime — 작업자의 지시 확인(알람 팝업 확인) 실시간 수신 ──
  // 작업자가 알람을 확인하면 상급자/작업자 화면 모두 같은 타임라인이 즉시 갱신되도록 한다.
  useEffect(() => {
    const channel = supabase
      .channel("directives-confirm-channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "directives" },
        (payload) => {
          const d = payload.new;
          if (!d.confirmed_at) return;
          // 현재 보고 있는 타임라인 캐시를 무효화해서 다시 불러오게 함
          setTlLoadedFor((prev) => (prev === d.accident_id ? null : prev));
          if (userRole === "supervisor" || userRole === "situation") {
            const confirmNotif = {
              id: `confirm-${d.id}-${d.confirmed_at}`,
              title: "✓ 작업자 확인 완료",
              body: `현장 작업자가 '${d.action_label}' 지시를 확인했습니다.`,
              message: `'${d.action_label}' 지시를 현장 작업자가 확인했습니다.`,
              actionLabel: d.action_label,
              supervisorName: "현장 작업자",
              sentAt: d.confirmed_at,
            };
            setNotifBanner(confirmNotif);
            setTimeout(() => setNotifBanner(null), 5000);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

  // ── Supabase Realtime — 사고 상태 변경(상황종료 등) 실시간 반영 ──
  // 상황실에서 상황종료 처리하면 상급자 대시보드도 새로고침 없이 자동으로 "완료"로 바뀌도록 한다.
  useEffect(() => {
    if (userRole !== "supervisor" && userRole !== "situation") return;
    const channel = supabase
      .channel("accident-status-channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "accident_reports" },
        (payload) => {
          const updated = payload.new;
          setAccidentReports(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
          setSelectedAccident(prev => (prev && prev.id === updated.id) ? { ...prev, ...updated } : prev);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

  // ── Supabase Realtime — 직원 관리(users) 실시간 반영 ──
  // 직원 추가/수정/삭제(비활성화)가 새로고침 없이도 상황실 화면에 바로 반영되도록 한다.
  useEffect(() => {
    if (userRole !== "situation") return;
    const channel = supabase
      .channel("staff-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          // insert/update/delete 어떤 경우든 목록과 팀 매핑을 다시 불러와 최신 상태 유지
          supabase.from("users").select("*").order("role", { ascending: true })
            .then(({ data }) => { if (data) setStaffList(data); });
          supabase.from("users").select("name, team")
            .then(({ data }) => {
              if (data) {
                const map = {};
                data.forEach(u => { if (u.name) map[u.name] = u.team; });
                setStaffTeamMap(map);
              }
            });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

  // ── Supabase Realtime — 상황실 공유(TBM확인/피재자상태확인/추가공유) 수신(상급자) ──
  useEffect(() => {
    if (userRole !== "supervisor") return;
    const channel = supabase
      .channel("situation-share-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "directives" },
        (payload) => {
          const d = payload.new;
          const SITUATION_SHARE_LABELS = { "TBM확인공유": "TBM 등록 현황 확인", "피재자상태공유": "피재자 상태 확인", "추가공유": "추가 공유" };
          if (!SITUATION_SHARE_LABELS[d.action_key]) return;
          const shareNotif = {
            id: d.id,
            title: `안전 상황실 — ${SITUATION_SHARE_LABELS[d.action_key]}`,
            body: d.message || "내용을 확인해주세요.",
            message: d.message,
            actionLabel: SITUATION_SHARE_LABELS[d.action_key],
            supervisorName: d.supervisor_name || "안전 상황실",
            sentAt: d.sent_at,
          };
          setNotifBanner(shareNotif);
          setTimeout(() => setNotifBanner(null), 6000);
          // 지금 보고 있는 타임라인이 이 사고 건이면 캐시 무효화해서 자동으로 다시 불러오게 함
          setTlLoadedFor((prev) => (prev === d.accident_id ? null : prev));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userRole]);

  const currentRecipients = RECIPIENTS_BY_TYPE[workType] || RECIPIENTS_BY_TYPE["유지보수"];

  // ── 작업자/상급자가 동일하게 보는 공용 타임라인 조회 ──────
  // accident_reports / directives / dispatches를 실제 사고 id로 필터링해서
  // 작업자 화면과 상급자 화면이 항상 같은 내용을 보도록 한다.
  // 작업자 이름 → 소속팀 매핑 (accident_reports에는 team 컬럼이 없어 users 테이블에서 가져와 화면에서 합쳐 보여준다)
  const loadStaffTeamMap = async () => {
    const { data } = await supabase.from("users").select("name, team");
    if (data) {
      const map = {};
      data.forEach(u => { if (u.name) map[u.name] = u.team; });
      setStaffTeamMap(map);
    }
  };

  // 긴급조치 체크리스트(작업중지/119신고/현장통제) 세부항목 체크를 DB에 기록 — directives 테이블을 재사용
  // action_key를 "checklist_항목키_순번" 형태로 저장해서 타임라인에서 구분해 표시한다.
  const toggleChecklistItem = async (accId, itemKey, subIndex, label, willCheck) => {
    const id = `${itemKey}-${subIndex}`;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setSubItemChecked(prev => ({ ...prev, [id]: willCheck }));
    setSubItemTimes(prev => ({ ...prev, [id]: willCheck ? hhmm : null }));
    if (!accId) return;
    const actionKey = `checklist_${itemKey}_${subIndex}`;
    // 이전 기록 제거 후, 체크하는 경우에만 새로 기록 (재체크/해제 토글을 그대로 반영)
    await supabase.from("directives").delete().eq("accident_id", accId).eq("action_key", actionKey);
    if (willCheck) {
      await supabase.from("directives").insert({
        accident_id: accId,
        action_key: actionKey,
        action_label: label,
        message: "현장 작업자 확인 완료",
        supervisor_name: currentUser?.name || "현장 작업자",
      });
    }
    loadSharedTimeline(accId);
  };

  const loadSharedTimeline = async (accId) => {
    if (!accId) { setTlEvents([]); setTlLoadedFor(accId); return; }
    const results = [];

    const { data: reports } = await supabase
      .from("accident_reports").select("*").eq("id", accId);
    if (reports) reports.forEach(r => results.push({
      time: new Date(r.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      text: `🚨 1차 보고 접수 — ${r.accident_type} / ${r.worker_name}${r.team ? " (" + r.team + ")" : ""}`,
      color: "#E24B4A",
    }));

    const { data: dirs } = await supabase
      .from("directives").select("*").eq("accident_id", accId).order("sent_at", { ascending: true });
    const checklistState = {}; // DB에 저장된 긴급조치 체크 상태 — 화면 표시용으로 동기화
    if (dirs) dirs.forEach(d => {
      if (d.action_key === "응급조치_병원입력") return; // 작업자 팝업 트리거용 — 타임라인에는 비노출
      if (d.action_key.startsWith("checklist_")) {
        // 긴급조치 체크리스트(작업중지/119신고/현장통제) 세부항목 체크 기록
        const rest = d.action_key.slice("checklist_".length);
        const lastDash = rest.lastIndexOf("_");
        const itemKey = rest.slice(0, lastDash);
        const subIndex = rest.slice(lastDash + 1);
        checklistState[`${itemKey}-${subIndex}`] = new Date(d.sent_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
        results.push({
          time: new Date(d.sent_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          text: `✅ 조치 확인 — ${d.action_label}`,
          color: "#276749",
        });
        return;
      }
      const SITUATION_SHARE_KEYS = { "TBM확인공유": "📋 TBM 등록 현황 확인", "피재자상태공유": "🩹 피재자 상태 확인", "추가공유": "📎 추가 공유" };
      if (SITUATION_SHARE_KEYS[d.action_key]) {
        results.push({
          time: new Date(d.sent_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          text: `${SITUATION_SHARE_KEYS[d.action_key]}${d.message ? ` — ${d.message}` : ""}`,
          color: "#B7791F",
          photoUrl: d.photo_url || null,
        });
        return;
      }
      const isFromSituationRoom = d.supervisor_name && d.supervisor_name.includes("상황실");
      const text = d.action_key === "병원이름_입력완료"
        ? `🏥 ${d.message || "병원 이송 정보 입력"}` // 작업자가 실제 입력한 "이송 병원: OOO" 그대로 표시
        : d.action_key === "상황종료"
        ? `✅ 상황 종료`
        : `📨 ${isFromSituationRoom ? "상황실" : "상급자 지시"} — ${d.action_label}${d.supervisor_name ? ` (${d.supervisor_name})` : ""}`;
      const color = d.action_key === "병원이름_입력완료" ? "#6B46C1"
        : d.action_key === "상황종료" ? "#38A169" : "#2B6CB0";
      results.push({
        time: new Date(d.sent_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        text, color,
      });
      // 작업자가 알람 팝업을 확인하면 그 확인 기록도 같은 타임라인에 이벤트로 추가
      if (d.confirmed_at) {
        results.push({
          time: new Date(d.confirmed_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          text: `✓ 작업자 확인 완료 — ${d.action_label}`,
          color: "#276749",
        });
      }
    });
    // 긴급조치 체크리스트 체크박스 상태를 DB 기준으로 동기화 (다른 세션/새로고침에도 항상 일치)
    setSubItemChecked(checklistState ? Object.fromEntries(Object.keys(checklistState).map(k => [k, true])) : {});
    setSubItemTimes(checklistState);

    // 3대 체크리스트(재지시대피/현장보존/병원이송) — 작업자·상급자 화면이 동일하게 참조하는 DB 기준 상태
    const CHECKLIST_KEYS = ["재지시대피", "현장보존", "병원이송"];
    const statusMap = {};
    (dirs || []).forEach(d => {
      if (CHECKLIST_KEYS.includes(d.action_key)) {
        statusMap[d.action_key] = { sentAt: d.sent_at, confirmedAt: d.confirmed_at || null };
      }
    });
    setDirectiveStatus(statusMap);

    const { data: disps } = await supabase
      .from("dispatches").select("*").eq("accident_id", accId).order("dispatched_at", { ascending: true });
    if (disps) disps.forEach(d => results.push({
      time: new Date(d.dispatched_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      text: `🚑 출동 지시 — ${d.dispatcher_name}${d.accident_minutes ? ` / 사고장소 ${d.accident_minutes}분` : ""}${d.hospital_minutes ? ` / 병원 ${d.hospital_minutes}분` : ""}`,
      color: "#185FA5",
    }));

    results.sort((a, b) => a.time.localeCompare(b.time));
    setTlEvents(results);
    setTlLoadedFor(accId);
  };

  // 타임라인 한 줄을 공통으로 그려주는 헬퍼 — 사진이 첨부된 이벤트는 클릭 시 확대 가능한 썸네일도 같이 보여준다
  const renderTimelineEvent = (ev, i) => (
    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 4 }} />
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#2B6CB0", marginRight: 6 }}>{ev.time}</span>
        <span style={{ fontSize: 12, color: "#111" }}>{ev.text}</span>
        {ev.photoUrl && (
          <div style={{ marginTop: 6 }}>
            <img
              src={ev.photoUrl}
              alt="공유된 사진"
              onClick={() => setLightboxUrl(ev.photoUrl)}
              style={{ width: 92, height: 70, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid #E2E8F0" }}
            />
          </div>
        )}
      </div>
    </div>
  );

  // ── 사고보고서(.docx) 생성 — 실제 사고 데이터를 채워 다운로드 ──
  const [reportGeneratingId, setReportGeneratingId] = useState(null);
  const generateAccidentReportDocx = async (accident) => {
    if (!accident) return;
    const docxLib = window.docx;
    if (!docxLib) {
      alert("보고서 생성 라이브러리를 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setReportGeneratingId(accident.id);
    try {
      const { data: dirs } = await supabase
        .from("directives").select("*").eq("accident_id", accident.id).order("sent_at", { ascending: true });

      // 초동조치사항 — 체크리스트(작업중지/119신고/현장통제)를 항목별로 묶어서 정리
      const CHECKLIST_LABELS = { stop: "작업 중지", report119: "119 신고", control: "현장 통제" };
      const checklistGroups = {};
      (dirs || []).forEach(d => {
        if (!d.action_key.startsWith("checklist_")) return;
        const rest = d.action_key.slice("checklist_".length);
        const itemKey = rest.slice(0, rest.lastIndexOf("_"));
        (checklistGroups[itemKey] = checklistGroups[itemKey] || []).push({ label: d.action_label, time: d.sent_at });
      });

      // 상급자 지시 및 조치 이력
      const SITUATION_SHARE_LABELS = { "TBM확인공유": "현장 공유 (TBM 확인)", "피재자상태공유": "현장 공유 (피재자 상태)", "추가공유": "현장 공유" };
      const timelineRows = [{
        time: accident.created_at,
        category: "1차 보고 접수",
        content: `${accident.accident_type} / ${accident.worker_name}${accident.team ? " (" + accident.team + ")" : ""}`,
        sender: "현장 작업자",
      }];
      (dirs || []).forEach(d => {
        if (d.action_key === "응급조치_병원입력" || d.action_key.startsWith("checklist_")) return;
        let category, content;
        if (d.action_key === "병원이름_입력완료") { category = "병원 이송 정보"; content = d.message || "-"; }
        else if (d.action_key === "상황종료") { category = "상황 종료"; content = d.message || "모든 조치 완료 확인 후 상황 종료"; }
        else if (SITUATION_SHARE_LABELS[d.action_key]) { category = SITUATION_SHARE_LABELS[d.action_key]; content = d.message || "-"; }
        else { category = (d.supervisor_name && d.supervisor_name.includes("상황실")) ? "상황실" : "상급자 지시"; content = d.action_label; }
        timelineRows.push({ time: d.sent_at, category, content, sender: d.supervisor_name || "-" });
      });
      timelineRows.sort((a, b) => new Date(a.time) - new Date(b.time));

      // 1차 보고 수신자
      const recipients = RECIPIENTS_BY_TYPE[accident.work_type] || RECIPIENTS_BY_TYPE["유지보수"];

      // 첨부 사진 — 사고 접수 시 첨부 + 현장 공유 중 사진이 있는 것들
      const allPhotoUrls = [
        ...(accident.photo_urls || []),
        ...(dirs || []).filter(d => d.photo_url).map(d => d.photo_url),
      ];
      const photoImages = [];
      for (const url of allPhotoUrls) {
        try {
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          const ext = (url.split("?")[0].split(".").pop() || "jpg").toLowerCase();
          const type = ["jpg", "jpeg", "png", "gif", "bmp"].includes(ext) ? (ext === "jpeg" ? "jpg" : ext) : "jpg";
          photoImages.push({ data: buf, type });
        } catch (e) {
          console.error("보고서용 사진 불러오기 실패:", url, e);
        }
      }

      const fmtDateTime = (d) => d ? new Date(d).toLocaleString("ko-KR") : "-";
      const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-";

      const children = [
        new docxLib.Paragraph({
          alignment: "center", spacing: { after: 60 },
          children: [new docxLib.TextRun({ text: "중대재해 사고 보고서", bold: true, size: 40, font: "맑은 고딕" })],
        }),
        new docxLib.Paragraph({
          alignment: "center", spacing: { after: 200 },
          children: [new docxLib.TextRun({ text: "SK 오앤에스 충청Access설비팀", size: 20, color: "888888", font: "맑은 고딕" })],
        }),
        new docxLib.Paragraph({
          alignment: "right",
          children: [new docxLib.TextRun({ text: `출력일시: ${new Date().toLocaleString("ko-KR")}`, size: 16, color: "999999", font: "맑은 고딕" })],
        }),
        new docxLib.Paragraph({
          alignment: "right", spacing: { after: 200 },
          children: [new docxLib.TextRun({
            text: `상태: ${accident.status || "진행중"}`, size: 16, bold: true, font: "맑은 고딕",
            color: accident.status === "완료" ? DOCX_GREEN : DOCX_RED,
          })],
        }),

        // 1. 사고 개요
        docxSectionHeading(1, "사고 개요"),
        new docxLib.Table({
          width: { size: DOCX_CONTENT_WIDTH, type: "dxa" },
          columnWidths: [2000, 5906, 2000, 3000],
          rows: [
            new docxLib.TableRow({ children: [docxLabelCell("사고 일시", 2000), docxValueCell(fmtDateTime(accident.created_at), 5906, { colSpan: 3 })] }),
            new docxLib.TableRow({ children: [docxLabelCell("사고 장소", 2000), docxValueCell(accident.location, 5906, { colSpan: 3 })] }),
            new docxLib.TableRow({ children: [
              docxLabelCell("사고 유형", 2000), docxValueCell(accident.accident_type, 5906),
              docxLabelCell("부상자 유무", 2000), docxValueCell(accident.has_injured ? "있음" : "없음", 3000, { color: accident.has_injured ? DOCX_RED : undefined, bold: !!accident.has_injured }),
            ] }),
            new docxLib.TableRow({ children: [
              docxLabelCell("작업 구분", 2000), docxValueCell(accident.work_type, 5906),
              docxLabelCell("사고 상태", 2000), docxValueCell(accident.status || "진행중", 3000, { color: accident.status === "완료" ? DOCX_GREEN : DOCX_RED, bold: true }),
            ] }),
            new docxLib.TableRow({ children: [docxLabelCell("사고 내용", 2000), docxValueCell(accident.content, 5906, { colSpan: 3 })] }),
          ],
        }),

        // 2. 작업자 정보
        docxSectionHeading(2, "작업자 정보"),
        new docxLib.Table({
          width: { size: DOCX_CONTENT_WIDTH, type: "dxa" },
          columnWidths: [2740, 2740, 2740, 2686],
          rows: [
            new docxLib.TableRow({ children: [docxLabelCell("성명", 2740), docxLabelCell("소속팀", 2740), docxLabelCell("업무유형", 2740), docxLabelCell("최초 보고 시각", 2686)] }),
            new docxLib.TableRow({ children: [
              docxValueCell(accident.worker_name, 2740), docxValueCell(accident.team || staffTeamMap[accident.worker_name], 2740),
              docxValueCell(accident.work_type, 2740), docxValueCell(fmtDateTime(accident.created_at), 2686),
            ] }),
          ],
        }),

        // 3. 1차 보고 수신자
        docxSectionHeading(3, "1차 보고 수신자"),
        new docxLib.Table({
          width: { size: DOCX_CONTENT_WIDTH, type: "dxa" },
          columnWidths: [3000, 3000, 3906],
          rows: [
            new docxLib.TableRow({ children: [docxLabelCell("이름", 3000), docxLabelCell("직책", 3000), docxLabelCell("연락처", 3906)] }),
            ...recipients.map(r => new docxLib.TableRow({ children: [docxValueCell(r.name, 3000), docxValueCell(r.tier, 3000), docxValueCell(r.phone, 3906)] })),
          ],
        }),

        // 4. 초동 조치사항
        docxSectionHeading(4, "초동 조치사항"),
        docxBodyText("현장 작업자가 앱을 통해 체크한 긴급조치 이행 현황입니다.", { color: "888888" }),
        Object.keys(checklistGroups).length === 0
          ? docxBodyText("기록된 초동 조치 체크 내역이 없습니다.", { color: "AAAAAA" })
          : new docxLib.Table({
              width: { size: DOCX_CONTENT_WIDTH, type: "dxa" },
              columnWidths: [2400, 6906, 1600],
              rows: [
                new docxLib.TableRow({ children: [docxLabelCell("구분", 2400), docxLabelCell("세부 내용", 6906), docxLabelCell("확인 시각", 1600)] }),
                ...Object.entries(checklistGroups).map(([itemKey, items]) => new docxLib.TableRow({
                  children: [
                    docxValueCell(CHECKLIST_LABELS[itemKey] || itemKey, 2400),
                    docxValueCell(items.map(it => it.label).join(" / "), 6906),
                    docxValueCell(fmtTime(items[items.length - 1].time), 1600),
                  ],
                })),
              ],
            }),

        // 5. 상급자 지시 및 조치 이력
        docxSectionHeading(5, "상급자 지시 및 조치 이력"),
        new docxLib.Table({
          width: { size: DOCX_CONTENT_WIDTH, type: "dxa" },
          columnWidths: [1600, 2600, 5106, 1600],
          rows: [
            new docxLib.TableRow({ children: [docxLabelCell("시각", 1600), docxLabelCell("구분", 2600), docxLabelCell("내용", 5106), docxLabelCell("발신자", 1600)] }),
            ...timelineRows.map(row => new docxLib.TableRow({
              children: [docxValueCell(fmtTime(row.time), 1600), docxValueCell(row.category, 2600), docxValueCell(row.content, 5106), docxValueCell(row.sender, 1600)],
            })),
          ],
        }),

        // 6. 첨부 사진
        docxSectionHeading(6, "첨부 사진"),
      ];

      if (photoImages.length === 0) {
        children.push(docxBodyText("등록된 사진이 없습니다.", { color: "AAAAAA" }));
      } else {
        const photoCellWidth = DOCX_CONTENT_WIDTH / 2;
        for (let i = 0; i < photoImages.length; i += 2) {
          const pair = [photoImages[i], photoImages[i + 1]];
          children.push(new docxLib.Table({
            width: { size: DOCX_CONTENT_WIDTH, type: "dxa" },
            columnWidths: [photoCellWidth, photoCellWidth],
            rows: [new docxLib.TableRow({
              children: pair.map((img) => new docxLib.TableCell({
                width: { size: photoCellWidth, type: "dxa" },
                borders: DOCX_CELL_BORDERS,
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [new docxLib.Paragraph({
                  alignment: "center",
                  children: img
                    ? [new docxLib.ImageRun({ type: img.type, data: img.data, transformation: { width: 260, height: 190 } })]
                    : [new docxLib.TextRun({ text: "", size: 1 })],
                })],
              })),
            })],
          }));
        }
      }

      const doc = new docxLib.Document({
        sections: [{
          properties: {
            page: {
              size: { width: DOCX_PAGE_WIDTH, height: 16838 },
              margin: { top: DOCX_MARGIN, bottom: DOCX_MARGIN, left: DOCX_MARGIN, right: DOCX_MARGIN },
            },
          },
          children,
        }],
      });

      const blob = await docxLib.Packer.toBlob(doc);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const dateStr = accident.created_at ? new Date(accident.created_at).toISOString().slice(0, 10) : "unknown";
      const teamName = (accident.team || staffTeamMap[accident.worker_name] || "미지정").replace(/[\\/:*?"<>|]/g, "_");
      const workerName = (accident.worker_name || "작업자").replace(/[\\/:*?"<>|]/g, "_");
      a.download = `사고보고서_${teamName}_${workerName}_${dateStr}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("보고서 생성 실패:", e);
      alert("보고서 생성에 실패했습니다: " + e.message);
    } finally {
      setReportGeneratingId(null);
    }
  };

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
    activeNotif.isClose ? (
      // ── 상황 종료 안내 — 차분한 전용 디자인, 확인 버튼 하나만 ──
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 375, height: "100%", zIndex: 9998,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}>
        <div style={{
          background: "#fff", borderRadius: 18, padding: "28px 22px", width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "#F0FFF4",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
          }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 10 }}>
            {activeNotif.title}
          </div>
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 22 }}>
            {activeNotif.body}
          </div>
          <button onClick={() => { setActiveNotif(null); goHome(); }} style={{
            width: "100%", padding: "13px", background: "#276749",
            border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff",
          }}>확인</button>
        </div>
      </div>
    ) : (
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

        {/* 지시에 해당하는 조치 체크리스트 — 바로 이 화면에서 체크 */}
        {DIRECTIVE_CHECKLIST[activeNotif.actionKey] && (
          <div style={{
            border: "1.5px solid #E2E8F0", borderRadius: 10,
            padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 8 }}>
              {DIRECTIVE_CHECKLIST[activeNotif.actionKey].icon} {DIRECTIVE_CHECKLIST[activeNotif.actionKey].question}
            </div>
            {DIRECTIVE_CHECKLIST[activeNotif.actionKey].subItems.map((sub, si) => {
              const cfg = DIRECTIVE_CHECKLIST[activeNotif.actionKey];
              const id = `${cfg.itemKey}-${si}`;
              const checked = !!subItemChecked[id];
              return (
                <button
                  key={si}
                  onClick={() => {
                    const accForChecklist = selectedAccident?.id || currentAccidentId;
                    toggleChecklistItem(accForChecklist, cfg.itemKey, si, sub, !checked);
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9,
                    padding: "7px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    background: checked ? cfg.color : "#fff",
                    border: `1.5px solid ${checked ? cfg.color : "#CBD5E0"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13.5, color: checked ? "#222" : "#555", fontWeight: checked ? 600 : 400 }}>{sub}</span>
                </button>
              );
            })}
          </div>
        )}

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
            // 상급자/작업자 화면이 같은 타임라인을 보도록 즉시 갱신
            const accForReload = selectedAccident?.id || currentAccidentId;
            if (accForReload) loadSharedTimeline(accForReload);
          }} style={{
            flex: 2, padding: "13px", background: "#E53E3E",
            border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff",
          }}>✓ 확인했습니다</button>
        </div>
      </div>
    </div>
    )
  ) : null;

  // 사진 확대보기 — 전체화면 라이트박스, 배경 탭하면 닫힘
  const PhotoLightbox = () => lightboxUrl ? (
    <div
      onClick={() => setLightboxUrl(null)}
      style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 375, height: "100%", zIndex: 10000,
        background: "rgba(0,0,0,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <button
        onClick={() => setLightboxUrl(null)}
        style={{
          position: "absolute", top: 16, right: 16, width: 36, height: 36,
          borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none",
          color: "#fff", fontSize: 20, cursor: "pointer",
        }}
      >×</button>
      <img
        src={lightboxUrl}
        alt="사고 현장 사진 확대"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, objectFit: "contain" }}
      />
    </div>
  ) : null;

  // ── 화면 00: 로그인 ──────────────────────────────────
  // 전역 알람 오버레이
  const GlobalOverlay = () => (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 99999 }}>
      <div style={{ pointerEvents: "auto" }}>
        {NotifBanner()}
        {NotifPopup()}
        {PhotoLightbox()}
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
      setPendingLoginUser(data);
      setCodeSent(true);
      setLoginStep("verify");
      setVerifyCode("");
    };

    const handleVerify = async () => {
      if (!pendingLoginUser) { setVerifyError("사용자 정보를 불러올 수 없습니다."); return; }
      if (verifyCode !== pendingLoginUser.pin) {
        setVerifyError("PIN 번호가 일치하지 않습니다. 다시 확인해주세요.");
        return;
      }
      const user = pendingLoginUser;
      setUserRole(user.role);
      setCurrentUser(user);
      if (user.work_type) setWorkType(user.work_type);
      if (user.role === "worker")     go(SCREENS.MAIN);
      if (user.role === "supervisor") go(SCREENS.SUPERVISOR_DASHBOARD);
      if (user.role === "situation")  go(SCREENS.SITUATION_ROOM);
    };

    return (
      <div style={styles.phone}>{GlobalOverlay()}
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
                등록된 번호로 PIN 번호를 입력해 로그인합니다.
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

              {/* 다음 버튼 */}
              <button
                onClick={handleSendCode}
                style={{
                  ...styles.redBtn, marginTop: phoneError ? 4 : 10,
                  fontSize: 16, padding: "15px",
                  boxShadow: "0 4px 12px rgba(229,62,62,0.25)",
                }}
              >다음</button>

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

          {/* ── STEP 2: PIN 번호 입력 ── */}
          {loginStep === "verify" && (
            <div style={{ width: "100%" }}>
              {/* 뒤로가기 */}
              <button
                onClick={() => { setLoginStep("phone"); setVerifyError(""); setCodeSent(false); setPendingLoginUser(null); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#888", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >‹ 번호 다시 입력</button>

              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>
                PIN 번호 입력
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 18, lineHeight: 1.6 }}>
                <span style={{ color: "#E53E3E", fontWeight: 700 }}>{pendingLoginUser?.name || phoneNum}</span>님,<br />
                등록하신 PIN 번호 6자리를 입력해주세요.
              </div>

              {/* PIN 박스 6칸 — 탭하면 키패드 자동 열림 */}
              <div
                onClick={() => document.getElementById("verify-input")?.focus()}
                style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 8, cursor: "pointer" }}
              >
                {[0,1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    width: 42, height: 54, borderRadius: 10,
                    border: `2px solid ${
                      verifyError ? "#E53E3E"
                      : verifyCode.length > i ? "#E53E3E"
                      : "#E2E8F0"
                    }`,
                    background: verifyCode.length > i ? "#FFF5F5" : "#F7FAFC",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 800, color: "#E53E3E",
                    transition: "all 0.1s",
                  }}>
                    {verifyCode[i] ? "●" : ""}
                  </div>
                ))}
              </div>

              {/* 실제 입력 필드 — 보이지 않지만 키패드 열림 */}
              <input
                id="verify-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                autoComplete="off"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerifyCode(v);
                  setVerifyError("");
                  if (v.length === 6) {
                    setTimeout(async () => {
                      if (!pendingLoginUser || v !== pendingLoginUser.pin) {
                        setVerifyError("PIN 번호가 일치하지 않습니다.");
                      } else {
                        const user = pendingLoginUser;
                        setUserRole(user.role);
                        setCurrentUser(user);
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

              {/* PIN 분실 안내 */}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <span style={{ fontSize: 13, color: "#888" }}>PIN 번호를 잊으셨나요? 안전관리팀에 문의해주세요.</span>
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
    // 작업자 홈에서도 사고 현황을 볼 수 있도록 목록을 불러온다
    const loadWorkerReports = async () => {
      setReportsLoading(true);
      const { data } = await supabase
        .from("accident_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setAccidentReports(data);
      setReportsLoading(false);
    };
    if (accidentReports.length === 0 && !reportsLoading) loadWorkerReports();
    if (Object.keys(staffTeamMap).length === 0) loadStaffTeamMap();

    const visibleReports = accidentReports.filter(a => !a.is_deleted);
    const totalCount  = visibleReports.length;
    const activeCount = visibleReports.filter(a => a.status === "진행중").length;
    const doneCount   = visibleReports.filter(a => a.status === "완료").length;
    const activeReports = visibleReports.filter(a => a.status === "진행중");
    const doneReports = visibleReports.filter(a => a.status === "완료");

    const goToReportStatus = (acc) => {
      setCurrentAccidentId(acc.id);
      setReportedAt(acc.created_at);
      setWorkType(acc.work_type);
      go(SCREENS.WORKER_TIMELINE);
    };

    return (
      <div style={styles.phone}>{GlobalOverlay()}
        <div style={{ textAlign: "center", padding: "20px 20px 0", position: "relative" }}>
          <div style={{ position: "absolute", right: 20, top: 20, fontSize: 22 }}>🔔</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>중대재해 대응 앱</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>안전한 현장을 위한 즉각적인 대응</div>
          {currentUser && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
              background: "#F7FAFC", border: "1px solid #E2E8F0", borderRadius: 20,
              padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#444",
            }}>
              👤 {currentUser.name}{currentUser.team ? ` · ${currentUser.team}` : ""}
            </div>
          )}
        </div>
        <div style={{ padding: "24px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
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

          {/* 사고 현황 요약 */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 10 }}>📋 사고 현황</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { key: "전체", label: "전체", count: totalCount, bg: "#F7FAFC", border: "#E2E8F0", color: "#2D3748" },
                { key: "진행중", label: "진행중", count: activeCount, bg: "#FFF5F5", border: "#FED7D7", color: "#E53E3E" },
                { key: "완료", label: "완료", count: doneCount, bg: "#F0FFF4", border: "#9AE6B4", color: "#276749" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setWorkerHomeFilter(f.key)}
                  style={{
                    flex: 1, background: f.bg, borderRadius: 10, padding: "12px 8px", textAlign: "center", cursor: "pointer",
                    border: workerHomeFilter === f.key ? `2px solid ${f.color}` : `1px solid ${f.border}`,
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: f.color }}>{f.count}</div>
                  <div style={{ fontSize: 11, color: f.color, marginTop: 2, fontWeight: workerHomeFilter === f.key ? 700 : 400 }}>{f.label}</div>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 8 }}>
              {workerHomeFilter === "전체" ? "📋 전체 사고" : workerHomeFilter === "진행중" ? "🚨 진행중인 사고" : "✅ 완료된 사고"}
            </div>
            {(() => {
              const listForFilter = workerHomeFilter === "전체" ? visibleReports : workerHomeFilter === "진행중" ? activeReports : doneReports;
              return listForFilter.length === 0 ? (
                <div style={{
                  background: "#F7FAFC", border: "1px solid #E2E8F0", borderRadius: 10,
                  padding: "16px", textAlign: "center", fontSize: 13, color: "#888", fontWeight: 600,
                }}>표시할 사고가 없습니다.</div>
              ) : (
                listForFilter.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => goToReportStatus(acc)}
                    style={{
                      width: "100%", textAlign: "left", background: "#fff",
                      border: `1.5px solid ${acc.status === "완료" ? "#9AE6B4" : "#FED7D7"}`, borderRadius: 12,
                      padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{acc.accident_type} 사고</span>
                      <span style={{
                        background: acc.status === "완료" ? "#F0FFF4" : "#FFF5F5",
                        color: acc.status === "완료" ? "#276749" : "#E53E3E",
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        border: `1px solid ${acc.status === "완료" ? "#9AE6B4" : "#FED7D7"}`,
                      }}>{acc.status || "진행중"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>👷 {staffTeamMap[acc.worker_name] ? `${staffTeamMap[acc.worker_name]} · ` : ""}{acc.worker_name} · {acc.work_type}</div>
                  </button>
                ))
              );
            })()}
          </div>

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
      <div style={styles.phone}>{GlobalOverlay()}
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

    const KAKAO_KEY = "b77c6b19bec3a7d35158dba04485acfe";

    // Nominatim(OpenStreetMap) 결과는 "건물번호, 도로명, 동, 구, 시" 순으로 오기 때문에
    // 한국 주소 표기 순서("시 구 동 도로명 건물번호")로 직접 재조립한다.
    const formatKoreanAddress = (addr, fallbackDisplayName, lat, lng) => {
      if (addr) {
        const parts = [
          addr.state,                                                       // 시/도
          addr.city || addr.county,                                         // 시/군/구
          addr.borough || addr.suburb || addr.village || addr.town || addr.neighbourhood, // 동/읍/면
          addr.road,                                                        // 도로명
          addr.house_number,                                                // 건물번호
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(" ");
      }
      return fallbackDisplayName || `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
    };

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
              { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
            );
            const data = await res.json();
            if (data.documents && data.documents.length > 0) {
              const addr = data.documents[0].address;
              setGpsAddress(addr.address_name);
            } else {
              // 카카오 실패 시 nominatim 사용 — 구조화된 address 필드로 한국식 순서로 재조립
              const res2 = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=ko`
              );
              const data2 = await res2.json();
              setGpsAddress(formatKoreanAddress(data2.address, data2.display_name, lat, lng));
            }
          } catch {
            try {
              const res2 = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=ko`
              );
              const data2 = await res2.json();
              setGpsAddress(formatKoreanAddress(data2.address, data2.display_name, lat, lng));
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

    // 주소 검색 (카카오 키워드 검색, 실패 시 Nominatim으로 폴백)
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
          return;
        }
      } catch {
        // 카카오 요청 자체가 실패(401 등)하면 아래 Nominatim으로 폴백
      }
      try {
        const res2 = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressSearchQuery)}&format=json&addressdetails=1&accept-language=ko&countrycodes=kr&limit=1`
        );
        const data2 = await res2.json();
        if (data2 && data2.length > 0) {
          const doc = data2[0];
          setGpsAddress(formatKoreanAddress(doc.address, doc.display_name, parseFloat(doc.lat), parseFloat(doc.lon)));
          setGpsCoords({ lat: parseFloat(doc.lat), lng: parseFloat(doc.lon) });
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
      <div style={styles.phone}>{GlobalOverlay()}
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
      <div style={styles.phone}>{GlobalOverlay()}
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
        file: f, // 실제 업로드용 원본 파일
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
      <div style={styles.phone}>{GlobalOverlay()}
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
    // 상급자(또는 상황실)가 실제로 보낸 지시에 해당하는 항목만 노출 — 팝업과 동일한 공용 설정 사용
    const ACTION_ITEMS = Object.entries(DIRECTIVE_CHECKLIST)
      .filter(([directiveKey]) => !!directiveStatus[directiveKey])
      .map(([directiveKey, cfg]) => ({ ...cfg, key: cfg.itemKey, desc: cfg.question, directiveKey }));


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
      <div style={styles.phone}>{GlobalOverlay()}
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

          {ACTION_ITEMS.length === 0 ? (
            <div style={{
              background: "#F7FAFC", border: "1px solid #E2E8F0", borderRadius: 10,
              padding: "24px 16px", textAlign: "center", color: "#888", fontSize: 13, lineHeight: 1.7,
            }}>
              아직 상급자(또는 상황실)로부터 받은 조치 지시가 없습니다.<br />
              지시가 오면 여기에서 해당 조치를 체크할 수 있어요.
            </div>
          ) : (
          <>
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
          </>
          )}

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
      <div style={styles.phone}>{GlobalOverlay()}
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
                      background: checked ? "#FFF5F5" : "#fff",
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
                // 저장(insert)과 조회(select)를 분리 — 한 번에 묶으면 '방금 넣은 걸 다시 읽는' 권한이
                // 없을 때 insert 자체가 롤백되어 아예 저장되지 않는 문제가 있어 분리함
                const { error: insertError } = await supabase.from("accident_reports").insert({
                  worker_name: currentUser?.name || "현장 작업자",
                  accident_type: selectedType,
                  work_type: workType,
                  location: gpsAddress || "위치 정보 없음",
                  content: accidentContent,
                  has_injured: hasInjured,
                  injured_name: injuredName,
                  status: "진행중",
                });
                if (insertError) {
                  console.error("사고 보고 저장 실패:", insertError);
                  alert("보고 전송에 실패했습니다. 네트워크 상태를 확인 후 다시 시도해주세요.");
                  return; // 저장 실패 시 완료 화면으로 넘어가지 않음
                }
                // 방금 저장한 사고의 실제 id를 별도로 조회 (타임라인 연동용 — 실패해도 보고 자체는 이미 저장됨)
                const { data: latest } = await supabase
                  .from("accident_reports")
                  .select("*")
                  .eq("worker_name", currentUser?.name || "현장 작업자")
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (latest) {
                  setCurrentAccidentId(latest.id);
                  setReportedAt(latest.created_at);
                  // 첨부 사진을 Storage에 업로드해서 상급자/상황실 화면에서도 볼 수 있게 함
                  // (실패해도 사고 보고 자체는 이미 저장된 상태라 흐름을 막지 않음)
                  try {
                    const photoUrls = [];
                    for (const p of uploadedPhotos) {
                      if (!p.file) continue;
                      const safeName = p.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
                      const path = `${latest.id}/${Date.now()}_${safeName}`;
                      const { error: uploadError } = await supabase.storage
                        .from("accident-photos")
                        .upload(path, p.file);
                      if (uploadError) { console.error("사진 업로드 실패:", uploadError); continue; }
                      const { data: pub } = supabase.storage.from("accident-photos").getPublicUrl(path);
                      if (pub?.publicUrl) photoUrls.push(pub.publicUrl);
                    }
                    if (photoUrls.length > 0) {
                      const { error: photoUpdateError } = await supabase
                        .from("accident_reports")
                        .update({ photo_urls: photoUrls })
                        .eq("id", latest.id);
                      if (photoUpdateError) console.error("사진 URL 저장 실패:", photoUpdateError);
                    }
                  } catch (e) {
                    console.error("사진 업로드 중 오류:", e);
                  }
                }
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
    return <CompleteScreen go={go} GlobalOverlay={GlobalOverlay} />;
  }

  // ── 화면 07-B: 현장작업자 보고현황 (타임라인 + 상급자 조치 지시) ─
  if (screen === SCREENS.WORKER_TIMELINE) {

    const SUPERVISOR_ITEMS = [
      { key: "재지시대피", icon: "🚫", color: "#C53030", label: "작업중지 재지시 + 대피 요청" },
      { key: "현장보존",   icon: "🔒", color: "#276749", label: "현장 보존" },
      { key: "병원이송",   icon: "🏥", color: "#6B46C1", label: "병원 이송" },
    ];

    // 상급자 화면과 동일한 소스(DB)에서 같은 타임라인을 불러온다
    if (tlLoadedFor !== currentAccidentId) loadSharedTimeline(currentAccidentId);

    const sentCount = SUPERVISOR_ITEMS.filter(it => directiveStatus[it.key]).length;

    return (
      <div style={styles.phone}>{GlobalOverlay()}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.COMPLETE)}>‹</button>
          <span style={styles.headerTitle}>보고 현황</span>
          <button style={styles.cancelBtn} onClick={goHome}>홈</button>
        </div>
        <div style={styles.body}>

          {/* 이송 병원 정보 — 언제든지 작성/수정 가능, 저장 시 타임라인에 즉시 반영 */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 8 }}>🏥 이송 병원 정보</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="예: 서산중앙병원"
                style={{
                  flex: 1, padding: "10px 12px", border: "1.5px solid #E2E8F0",
                  borderRadius: 8, fontSize: 14, outline: "none",
                }}
              />
              <button
                onClick={async () => {
                  if (!hospitalName.trim() || !currentAccidentId) return;
                  await supabase.from("directives").insert({
                    accident_id: currentAccidentId,
                    action_key: "병원이름_입력완료",
                    action_label: "병원 이송 정보",
                    message: `이송 병원: ${hospitalName}`,
                    supervisor_name: currentUser?.name || "현장 작업자",
                  });
                  loadSharedTimeline(currentAccidentId);
                }}
                style={{
                  padding: "0 18px", background: "#6B46C1", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >저장</button>
            </div>
          </div>

          {/* 타임라인 — 상급자 화면과 동일한 타임라인을 그대로 표시 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>진행 타임라인</span>
            <button
              onClick={() => { setTlLoadedFor(null); loadSharedTimeline(currentAccidentId); }}
              style={{ background: "none", border: "none", fontSize: 12, color: "#E53E3E", cursor: "pointer", fontWeight: 700 }}
            >새로고침</button>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            {tlEvents.length === 0 ? (
              <div style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>아직 기록 없음</div>
            ) : (
              tlEvents.map(renderTimelineEvent)
            )}
          </div>

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
    if (Object.keys(staffTeamMap).length === 0) loadStaffTeamMap();

    const ACCIDENT_ICONS = { "추락": "🧗", "감전": "⚡", "낙하/비래": "🪨", "화재": "🔥", "끼임": "⚙️", "충돌": "💥" };

    const visibleReports = accidentReports.filter(a => !a.is_deleted);
    const activeList = visibleReports.filter(a => a.status === "진행중");
    const doneList   = visibleReports.filter(a => a.status === "완료");

    const formatDate = (d) => {
      if (!d) return "-";
      const dt = new Date(d);
      return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
    };

    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>{GlobalOverlay()}
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
            {currentUser && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
                👤 {currentUser.name}{currentUser.team ? ` · ${currentUser.team}` : ""}
              </div>
            )}
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
            { label: "전체",   value: visibleReports.length, bg: "#fff",    color: "#111",    border: "#E2E8F0" },
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
                    onClick={() => { setSelectedAccident(acc); go(SCREENS.SUPERVISOR); }}
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
                      <div>👷 {staffTeamMap[acc.worker_name] ? `${staffTeamMap[acc.worker_name]} · ` : ""}{acc.worker_name} · {acc.work_type}</div>
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
      : emergencyUsers.filter(u => emergencyTab === "전체" || u.work_type === emergencyTab || u.work_type === "전체");

    return (
      <div style={styles.phone}>{GlobalOverlay()}
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
      {
        key: "TBM확인",
        label: "TBM 등록 현황 파악 요청",
        defaultMsg: `[TBM 등록 현황 파악 요청]\n\n금일 작업 관련 TBM(Tool Box Meeting)\n등록 현황을 확인하여 보고해주시기 바랍니다.\n\n- TBM 실시 여부 확인\n- 참석자 명단 확인\n- 등록 여부 및 등록 시각 보고 요망\n\n`,
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

      const accidentIdForDirective = selectedAccident?.id || currentAccidentId;

      // Supabase에 지시 저장 → Realtime으로 현장작업자에게 전달
      await supabase.from("directives").insert({
        accident_id: accidentIdForDirective,
        action_key: key,
        action_label: item?.label || key,
        message: directiveTexts[key] || item?.defaultMsg || "",
        supervisor_name: currentUser?.name || "상급자",
      });

      // 방금 보낸 지시까지 반영해서 타임라인 즉시 갱신 (작업자 화면과 동일하게 유지)
      loadSharedTimeline(accidentIdForDirective);
    };

    return (
      <div style={styles.phone}>{GlobalOverlay()}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.SUPERVISOR_DASHBOARD)}>‹</button>
          <span style={styles.headerTitle}>사고 상세 정보</span>
          <span />
        </div>
        <div style={{ ...styles.body, padding: "16px" }}>

          {/* 사고 정보 */}
          <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px", marginBottom: 14 }}>
            {[
              ["사고 일시", selectedAccident?.created_at ? new Date(selectedAccident.created_at).toLocaleString("ko-KR") : "-"],
              ["사고 장소", selectedAccident?.location || "-"],
              ["사고 유형", selectedAccident?.accident_type || "-"],
              ["사고 내용", selectedAccident?.content || "-"],
              ["작업자", `${selectedAccident?.worker_name || "-"}${selectedAccident?.team ? " · " + selectedAccident.team : ""}`],
            ].map(([k,v]) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 14 }}>
                <span style={{ color: "#888", minWidth: 60, flexShrink: 0 }}>{k}</span>
                <span style={{ color: "#111", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* 첨부 사진 — 작업자가 등록한 실제 사진, 클릭하면 확대 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>첨부 사진</div>
            {(selectedAccident?.photo_urls || []).length === 0 ? (
              <div style={{ fontSize: 12, color: "#aaa" }}>등록된 사진이 없습니다.</div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedAccident.photo_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`첨부 사진 ${i + 1}`}
                    onClick={() => setLightboxUrl(url)}
                    style={{ width: 90, height: 70, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "1px solid #E2E8F0" }}
                  />
                ))}
              </div>
            )}
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
                        📨 전송
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
    const timelineAccidentId = selectedAccident?.id || currentAccidentId;

    if (tlLoadedFor !== timelineAccidentId) loadSharedTimeline(timelineAccidentId);

    return (
      <div style={styles.phone}>{GlobalOverlay()}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={goHome}>‹</button>
          <span style={styles.headerTitle}>보고 현황</span>
          <button
            onClick={() => loadSharedTimeline(timelineAccidentId)}
            style={{ background: "none", border: "none", fontSize: 13, color: "#E53E3E", cursor: "pointer", fontWeight: 700 }}
          >새로고침</button>
        </div>
        <div style={styles.body}>
          {tlEvents.length === 0 ? (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "40px 0" }}>
              아직 기록된 내용이 없습니다.
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
              {tlEvents.map(renderTimelineEvent)}
            </div>
          )}
        </div>
      </div>
    );
  }


  if (screen === SCREENS.SITUATION_ROOM) {
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
        .order("role", { ascending: true });
      if (data) setStaffList(data);
    };

    if (accidentReports.length === 0) loadSituationReports();
    if (Object.keys(staffTeamMap).length === 0) loadStaffTeamMap();
    if (staffList.length === 0) loadStaff(); // 출동 지정(사고 현황 탭)에서도 필요해서 탭 상관없이 로드

    // 선택된 사고가 바뀌면 그 사고에 해당하는 타임라인만 다시 불러옴 (작업자/상급자와 동일한 데이터)
    if (situationTab === "사고 현황" && selectedAccident && tlLoadedFor !== selectedAccident.id) {
      loadSharedTimeline(selectedAccident.id);
    }

    const nowHHMM = () => {
      const d = new Date();
      return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
    };

    // 상급자 화면과 동일한 3대 조치 지시 — 상황실에서도 직접 보낼 수 있도록
    const SITUATION_SHARE_TYPES = [
      { key: "TBM확인공유", icon: "📋", label: "TBM 확인" },
      { key: "피재자상태공유", icon: "🩹", label: "피재자 상태 확인" },
      { key: "추가공유", icon: "📎", label: "추가 공유" },
    ];

    const handleSendSituationShare = async () => {
      if (!selectedAccident || !situationShareType) return;
      if (!situationShareText.trim() && !situationSharePhoto) {
        alert("내용을 입력하거나 사진을 첨부해주세요.");
        return;
      }
      setSituationShareSending(true);
      let photoUrl = null;
      if (situationSharePhoto?.file) {
        try {
          const safeName = situationSharePhoto.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const path = `${selectedAccident.id}/share_${Date.now()}_${safeName}`;
          const { error: upErr } = await supabase.storage.from("accident-photos").upload(path, situationSharePhoto.file);
          if (!upErr) {
            const { data: pub } = supabase.storage.from("accident-photos").getPublicUrl(path);
            photoUrl = pub?.publicUrl || null;
          } else {
            console.error("공유 사진 업로드 실패:", upErr);
          }
        } catch (e) {
          console.error("공유 사진 업로드 중 오류:", e);
        }
      }
      const shareLabel = SITUATION_SHARE_TYPES.find(t => t.key === situationShareType)?.label || situationShareType;
      const { error } = await supabase.from("directives").insert({
        accident_id: selectedAccident.id,
        action_key: situationShareType,
        action_label: shareLabel,
        message: situationShareText.trim(),
        photo_url: photoUrl,
        supervisor_name: currentUser?.name || "안전 상황실",
      });
      setSituationShareSending(false);
      if (error) {
        console.error("공유 전송 실패:", error);
        alert("전송에 실패했습니다: " + error.message);
        return;
      }
      setSituationShareType(null);
      setSituationShareText("");
      setSituationSharePhoto(null);
      loadSharedTimeline(selectedAccident.id);
    };

    const handleDispatch = async () => {
      if (!selectedMember || !selectedAccident) return;
      setDispatchedMembers(prev => ({ ...prev, [selectedMember.id]: true }));
      setSelectedMember(null);
      setAccMin("");
      setHospMin("");
      await supabase.from("dispatches").insert({
        accident_id: selectedAccident.id,
        dispatcher_name: selectedMember.name,
        dispatcher_role: "상황실",
        accident_minutes: accMin ? parseInt(accMin) : null,
        hospital_minutes: hospMin ? parseInt(hospMin) : null,
      });
      // 방금 등록한 출동 지시까지 포함해서 타임라인 다시 불러오기
      loadSharedTimeline(selectedAccident.id);
    };

    const handleSaveStaff = async () => {
      if (!newStaff.name || !newStaff.phone) return;
      const payload = {
        name: newStaff.name,
        phone: newStaff.phone.replace(/-/g, ""),
        role: newStaff.role,
        team: newStaff.team,
        work_type: newStaff.work_type || null,
      };
      const { error } = editingStaffId
        ? await supabase.from("users").update(payload).eq("id", editingStaffId)
        : await supabase.from("users").insert({ ...payload, is_active: true });
      if (error) {
        console.error("직원 저장 실패:", error);
        alert("직원 정보 저장에 실패했습니다: " + error.message);
        return;
      }
      setNewStaff({ name: "", phone: "", role: "worker", team: "", work_type: "유지보수" });
      setShowAddStaff(false);
      setEditingStaffId(null);
      loadStaff();
      loadStaffTeamMap(); // 방금 추가/수정한 직원의 소속팀도 즉시 반영되도록
    };

    const handleEditStaff = (s) => {
      setNewStaff({
        name: s.name || "", phone: s.phone || "", role: s.role || "worker",
        team: s.team || "", work_type: s.work_type || "유지보수",
      });
      setEditingStaffId(s.id);
      setShowAddStaff(true);
    };

    // 사고 목록에서 삭제 — 실제로 지우지 않고 is_deleted만 표시. 작업자/상급자/사고현황엔 안 보이지만 사고 이력엔 남음
    const handleDeleteAccident = async (id) => {
      if (!window.confirm("이 사고를 목록에서 삭제하시겠습니까?\n삭제해도 사고 이력에서는 계속 조회할 수 있습니다.")) return;
      const { error } = await supabase.from("accident_reports").update({ is_deleted: true }).eq("id", id);
      if (error) {
        console.error("사고 삭제 실패:", error);
        alert("삭제에 실패했습니다: " + error.message);
        return;
      }
      setAccidentReports(prev => prev.map(a => a.id === id ? { ...a, is_deleted: true } : a));
      if (selectedAccident?.id === id) setSelectedAccident(null);
    };

    // 사고 이력에서 완전 삭제 — 되돌릴 수 없음 (직접 연결된 지시/출동 기록까지 함께 제거)
    // 사고 이력에서 체크한 여러 건을 한 번에 영구 삭제
    const handleBulkPermanentDelete = async () => {
      const ids = Object.keys(selectedHistoryIds).filter(id => selectedHistoryIds[id]);
      if (ids.length === 0) return;
      if (!window.confirm(`선택한 ${ids.length}건의 사고 기록을 영구적으로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 관련된 지시·출동 기록도 함께 삭제됩니다.`)) return;
      // .select()를 붙여서 실제로 삭제된 행을 돌려받는다 — RLS가 막고 있으면 에러 없이 0건이 돌아온다
      const { data, error } = await supabase.from("accident_reports").delete().in("id", ids).select();
      if (error) {
        console.error("사고 일괄 영구 삭제 실패:", error);
        alert("영구 삭제에 실패했습니다: " + error.message);
        return;
      }
      if (!data || data.length === 0) {
        alert("삭제 권한이 없어 실제로는 삭제되지 않았습니다. Supabase의 accident_reports 테이블에 DELETE 정책이 필요합니다.");
        return;
      }
      const deletedIds = data.map(d => d.id);
      supabase.from("directives").delete().in("accident_id", deletedIds).then(() => {});
      supabase.from("dispatches").delete().in("accident_id", deletedIds).then(() => {});
      setAccidentReports(prev => prev.filter(a => !deletedIds.includes(a.id)));
      if (selectedAccident && deletedIds.includes(selectedAccident.id)) setSelectedAccident(null);
      setSelectedHistoryIds({});
    };

    // 보고서 출력 탭에서 체크한 여러 사고를 순서대로 각각 .docx로 생성/다운로드
    const handleBulkGenerateReports = async () => {
      const ids = Object.keys(selectedReportIds).filter(id => selectedReportIds[id]);
      if (ids.length === 0) return;
      const targets = accidentReports.filter(a => ids.includes(a.id));
      setBulkReportProgress({ current: 0, total: targets.length });
      for (let i = 0; i < targets.length; i++) {
        setBulkReportProgress({ current: i + 1, total: targets.length });
        await generateAccidentReportDocx(targets[i]);
      }
      setBulkReportProgress(null);
      setSelectedReportIds({});
    };

    const handleSetStaffActive = async (id, active) => {
      await supabase.from("users").update({ is_active: active }).eq("id", id);
      loadStaff();
      loadStaffTeamMap();
    };

    // 직원을 목록에서 완전히 삭제 (비활성화와 달리 되돌릴 수 없음)
    const handleDeleteStaffMember = async (s) => {
      if (!window.confirm(`${s.name}님을 직원 목록에서 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다. (계정 로그인도 즉시 불가능해집니다)`)) return;
      // .select()를 붙여서 실제로 삭제된 행을 돌려받는다 — RLS가 막고 있으면 에러 없이 0건이 돌아온다
      const { data, error } = await supabase.from("users").delete().eq("id", s.id).select();
      if (error) {
        alert("삭제에 실패했습니다: " + error.message);
        return;
      }
      if (!data || data.length === 0) {
        alert("삭제 권한이 없어 실제로는 삭제되지 않았습니다. Supabase의 users 테이블에 DELETE 정책이 필요합니다.");
        return;
      }
      loadStaff();
      loadStaffTeamMap();
    };

    // 엑셀(직원 대량등록 양식)을 읽어서 users 테이블에 한 번에 등록
    // 역할/업무유형 한글 라벨 → DB 저장값 매핑
    const ROLE_LABEL_TO_CODE = { "현장 작업자": "worker", "상급자": "supervisor", "상황실": "situation" };
    const handleExcelUpload = async (file) => {
      if (!file) return;
      setExcelUploading(true);
      setExcelUploadResults(null);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        // header:1 → 각 행을 배열 그대로 가져와서, 양식 헤더 행("이름","전화번호"...)을 직접 찾는다
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        const headerRowIdx = rows.findIndex(r => r.includes("이름") && r.includes("전화번호"));
        if (headerRowIdx === -1) {
          alert("양식을 찾을 수 없습니다. 제공된 엑셀 양식 그대로 사용해주세요 (이름/전화번호/역할/소속팀/업무유형 헤더 필요).");
          setExcelUploading(false);
          return;
        }
        const header = rows[headerRowIdx];
        const colIdx = {
          name: header.indexOf("이름"),
          phone: header.indexOf("전화번호"),
          role: header.indexOf("역할"),
          team: header.indexOf("소속팀"),
          work_type: header.indexOf("업무유형"),
          pin: header.findIndex(h => String(h).startsWith("PIN")),
        };
        const dataRows = rows.slice(headerRowIdx + 1);

        const success = [], skipped = [], failed = [];
        const existingPhones = new Set(staffList.map(s => s.phone));

        for (const row of dataRows) {
          const name = String(row[colIdx.name] || "").trim();
          const phoneRaw = String(row[colIdx.phone] || "").trim();
          const roleLabel = String(row[colIdx.role] || "").trim();
          const team = String(row[colIdx.team] || "").trim();
          const workType = String(row[colIdx.work_type] || "").trim();
          const pinRaw = colIdx.pin >= 0 ? String(row[colIdx.pin] || "").trim() : "";
          // 완전히 빈 행이거나, 양식 예시 행(김철수/010-1234-5678) 그대로면 건너뜀
          if (!name && !phoneRaw) continue;
          if (name === "김철수" && phoneRaw.replace(/\D/g, "") === "01012345678") continue;

          const phone = phoneRaw.replace(/\D/g, "");
          if (!name || phone.length !== 11) {
            failed.push({ name: name || "(이름 없음)", phone: phoneRaw, reason: "이름 또는 전화번호 형식 오류" });
            continue;
          }
          if (existingPhones.has(phone)) {
            skipped.push({ name, phone, reason: "이미 등록된 번호" });
            continue;
          }
          const role = ROLE_LABEL_TO_CODE[roleLabel];
          if (!role) {
            failed.push({ name, phone, reason: `역할 값 오류 ("${roleLabel}") — 현장 작업자/상급자/상황실 중 하나여야 함` });
            continue;
          }
          const insertPayload = {
            name, phone, role, team: team || null,
            work_type: workType || "유지보수",
            is_active: true,
          };
          if (/^\d{6}$/.test(pinRaw)) insertPayload.pin = pinRaw; // PIN 칸을 채워왔으면 등록과 동시에 반영
          const { error } = await supabase.from("users").insert(insertPayload);
          if (error) {
            failed.push({ name, phone, reason: error.message });
          } else {
            success.push({ name, phone });
            existingPhones.add(phone); // 같은 파일 안에서 중복 방지
          }
        }

        setExcelUploadResults({ success, skipped, failed });
        loadStaff();
        loadStaffTeamMap();
      } catch (e) {
        console.error("엑셀 업로드 실패:", e);
        alert("엑셀 파일을 읽는 중 오류가 발생했습니다. 제공된 양식 파일이 맞는지 확인해주세요.");
      } finally {
        setExcelUploading(false);
      }
    };

    // 같은 엑셀 양식에서 전화번호 + PIN 열만 읽어서, 이미 등록된 직원들의 PIN을 한 번에 설정/변경
    const handlePinExcelUpload = async (file) => {
      if (!file) return;
      setPinExcelUploading(true);
      setPinExcelResults(null);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        const headerRowIdx = rows.findIndex(r => r.includes("이름") && r.includes("전화번호"));
        if (headerRowIdx === -1) {
          alert("양식을 찾을 수 없습니다. 제공된 엑셀 양식 그대로 사용해주세요.");
          setPinExcelUploading(false);
          return;
        }
        const header = rows[headerRowIdx];
        const colIdx = {
          name: header.indexOf("이름"),
          phone: header.indexOf("전화번호"),
          pin: header.findIndex(h => String(h).startsWith("PIN")),
        };
        if (colIdx.pin === -1) {
          alert("이 파일에는 PIN 열이 없습니다. 제공된 최신 양식(PIN 열 포함)을 사용해주세요.");
          setPinExcelUploading(false);
          return;
        }
        const dataRows = rows.slice(headerRowIdx + 1);
        const phoneToUser = new Map(staffList.map(s => [s.phone, s]));

        const success = [], skipped = [], failed = [];
        for (const row of dataRows) {
          const name = String(row[colIdx.name] || "").trim();
          const phoneRaw = String(row[colIdx.phone] || "").trim();
          const pinRaw = String(row[colIdx.pin] || "").trim();
          if (!name && !phoneRaw) continue;
          if (name === "김철수" && phoneRaw.replace(/\D/g, "") === "01012345678") continue;
          if (!pinRaw) continue; // PIN 칸이 비어있으면 그냥 건너뜀 (등록/역할 변경용 행일 수 있으므로)

          const phone = phoneRaw.replace(/\D/g, "");
          if (!/^\d{6}$/.test(pinRaw)) {
            failed.push({ name, phone, reason: "PIN은 숫자 6자리여야 함" });
            continue;
          }
          const target = phoneToUser.get(phone);
          if (!target) {
            skipped.push({ name, phone, reason: "등록되지 않은 번호" });
            continue;
          }
          const { error } = await supabase.from("users").update({ pin: pinRaw }).eq("id", target.id);
          if (error) failed.push({ name, phone, reason: error.message });
          else success.push({ name: target.name, phone });
        }

        setPinExcelResults({ success, skipped, failed });
        loadStaff();
      } catch (e) {
        console.error("PIN 엑셀 업로드 실패:", e);
        alert("엑셀 파일을 읽는 중 오류가 발생했습니다.");
      } finally {
        setPinExcelUploading(false);
      }
    };

    // 소속팀별로 묶어서 표시 — 팀 미지정은 "미지정"으로 그룹
    const staffByTeam = staffList.reduce((groups, s) => {
      const key = s.team || "미지정";
      (groups[key] = groups[key] || []).push(s);
      return groups;
    }, {});

    const ROLE_LABEL = { worker: "현장 작업자", supervisor: "상급자", situation: "상황실" };

    return (
      <div style={{ display: "flex", height: "100vh", fontFamily: "'Apple SD Gothic Neo', sans-serif", background: "#F7F8FC" }}>
        {GlobalOverlay()}

        {/* 사이드바 */}
        <div style={{ width: 200, background: "#1A365D", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>안전 상황실</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>SK O&S 중대재해 대응</div>
          </div>
          {["사고 현황", "직원 관리", "사고 이력", "비상 연락망", "보고서 출력", "설정"].map(label => (
            <div key={label} onClick={() => { if(label === "사고 현황" || label === "직원 관리" || label === "사고 이력" || label === "보고서 출력" || label === "설정") setSituationTab(label); }} style={{
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
              {situationTab === "직원 관리" ? "직원 관리" : situationTab === "사고 이력" ? "사고 이력" : situationTab === "보고서 출력" ? "보고서 출력" : situationTab === "설정" ? "설정" : "실시간 사고 현황"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {situationTab === "사고 현황" && (
                <button onClick={loadSituationReports} style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>새로고침</button>
              )}
              {situationTab === "직원 관리" && (
                <>
                  <a
                    href="/직원_대량등록_양식.xlsx"
                    download="직원_대량등록_양식.xlsx"
                    style={{
                      fontSize: 12, padding: "4px 12px", background: "#fff", color: "#555",
                      border: "1px solid #E2E8F0", borderRadius: 6, textDecoration: "none", fontWeight: 700,
                    }}
                  >📥 양식 다운로드</a>
                  <label style={{
                    fontSize: 12, padding: "4px 12px", background: "#fff", color: "#2B6CB0",
                    border: "1px solid #BEE3F8", borderRadius: 6, cursor: excelUploading ? "default" : "pointer",
                    fontWeight: 700, opacity: excelUploading ? 0.5 : 1,
                  }}>
                    {excelUploading ? "업로드 중..." : "📤 엑셀로 일괄 등록"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={excelUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); e.target.value = ""; }}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button onClick={() => { setEditingStaffId(null); setNewStaff({ name: "", phone: "", role: "worker", team: "", work_type: "유지보수" }); setShowAddStaff(true); }} style={{ fontSize: 12, padding: "4px 12px", background: "#E53E3E", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>+ 직원 추가</button>
                </>
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
              {/* 엑셀 업로드 결과 */}
              {excelUploadResults && (
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>📤 엑셀 업로드 결과</div>
                    <button onClick={() => setExcelUploadResults(null)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}>닫기 ✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: "#276749", fontWeight: 700 }}>✅ 등록 완료 {excelUploadResults.success.length}명</span>
                    <span style={{ color: "#B7791F", fontWeight: 700 }}>⏭ 건너뜀 {excelUploadResults.skipped.length}명</span>
                    <span style={{ color: "#C53030", fontWeight: 700 }}>⚠️ 실패 {excelUploadResults.failed.length}명</span>
                  </div>
                  {excelUploadResults.success.length > 0 && (
                    <div style={{ marginBottom: 10, fontSize: 12, color: "#276749" }}>
                      💡 지금 등록된 직원들은 아직 PIN이 없어요. <strong>설정 → PIN 일괄 발급</strong>에서 한 번에 발급해주세요.
                    </div>
                  )}
                  {(excelUploadResults.skipped.length > 0 || excelUploadResults.failed.length > 0) && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                          <th style={{ padding: "4px 8px", textAlign: "left", color: "#888" }}>이름</th>
                          <th style={{ padding: "4px 8px", textAlign: "left", color: "#888" }}>전화번호</th>
                          <th style={{ padding: "4px 8px", textAlign: "left", color: "#888" }}>사유</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...excelUploadResults.skipped, ...excelUploadResults.failed].map((r, i) => (
                          <tr key={i}>
                            <td style={{ padding: "4px 8px" }}>{r.name}</td>
                            <td style={{ padding: "4px 8px", color: "#888" }}>{r.phone}</td>
                            <td style={{ padding: "4px 8px", color: "#C53030" }}>{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* 직원 추가 폼 */}
              {showAddStaff && (
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>{editingStaffId ? "직원 정보 수정" : "직원 추가"}</div>
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
                        <option value="전체">전체</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
                    💡 PIN 번호는 여기서 설정하지 않아요. 등록 후 "설정" 메뉴에서 발급/관리합니다.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowAddStaff(false); setEditingStaffId(null); setNewStaff({ name: "", phone: "", role: "worker", team: "", work_type: "유지보수" }); }} style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff" }}>취소</button>
                    <button onClick={handleSaveStaff} style={{ padding: "8px 16px", background: "#E53E3E", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>{editingStaffId ? "수정 저장" : "저장"}</button>
                  </div>
                </div>
              )}

              {/* 직원 목록 — 소속팀별로 그룹핑 */}
              {staffList.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                  직원을 불러오는 중...
                </div>
              ) : (
                Object.entries(staffByTeam).map(([team, members]) => {
                  const isCollapsed = !!collapsedStaffTeams[team];
                  return (
                  <div key={team} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
                    <div
                      onClick={() => setCollapsedStaffTeams(prev => ({ ...prev, [team]: !prev[team] }))}
                      style={{
                        padding: "10px 14px", background: "#F7FAFC", borderBottom: isCollapsed ? "none" : "1px solid #E2E8F0",
                        fontSize: 13, fontWeight: 700, color: "#111", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none",
                      }}
                    >
                      <span>🏷️ {team} <span style={{ color: "#888", fontWeight: 400 }}>({members.length}명)</span></span>
                      <span style={{ color: "#888", fontSize: 11, transform: isCollapsed ? "rotate(-90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
                    </div>
                    {!isCollapsed && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                          {["이름", "핸드폰", "역할", "업무유형", "상태", "관리"].map(h => (
                            <th key={h} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#888", textAlign: "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: "1px solid #F7F7F7", background: i % 2 === 0 ? "#fff" : "#FAFAFA", opacity: s.is_active ? 1 : 0.5 }}>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111" }}>{s.name}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{s.phone?.replace(/(d{3})(d{4})(d{4})/, "$1-$2-$3")}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                                background: s.role === "worker" ? "#FFF5F5" : s.role === "supervisor" ? "#EBF8FF" : "#F0FFF4",
                                color: s.role === "worker" ? "#C53030" : s.role === "supervisor" ? "#2B6CB0" : "#276749",
                              }}>{ROLE_LABEL[s.role]}</span>
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{s.work_type || "-"}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                                background: s.is_active ? "#F0FFF4" : "#F7FAFC",
                                color: s.is_active ? "#276749" : "#888",
                                border: s.is_active ? "1px solid #9AE6B4" : "1px solid #E2E8F0",
                              }}>{s.is_active ? "활성" : "비활성"}</span>
                            </td>
                            <td style={{ padding: "10px 14px", display: "flex", gap: 6 }}>
                              <button onClick={() => handleEditStaff(s)} style={{ fontSize: 11, padding: "3px 10px", background: "#EBF8FF", color: "#2B6CB0", border: "1px solid #BEE3F8", borderRadius: 6, cursor: "pointer" }}>수정</button>
                              <button
                                disabled={s.is_active}
                                onClick={() => handleSetStaffActive(s.id, true)}
                                style={{ fontSize: 11, padding: "3px 10px", background: "#F0FFF4", color: "#276749", border: "1px solid #9AE6B4", borderRadius: 6, cursor: s.is_active ? "default" : "pointer", opacity: s.is_active ? 0.4 : 1 }}
                              >활성화</button>
                              <button
                                disabled={!s.is_active}
                                onClick={() => handleSetStaffActive(s.id, false)}
                                style={{ fontSize: 11, padding: "3px 10px", background: "#FFF5F5", color: "#C53030", border: "1px solid #FED7D7", borderRadius: 6, cursor: !s.is_active ? "default" : "pointer", opacity: !s.is_active ? 0.4 : 1 }}
                              >비활성화</button>
                              <button
                                onClick={() => handleDeleteStaffMember(s)}
                                style={{ fontSize: 11, padding: "3px 10px", background: "#fff", color: "#888", border: "1px solid #E2E8F0", borderRadius: 6, cursor: "pointer" }}
                              >삭제</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          )}

          {/* 사고 이력 탭 — 삭제된 사고도 포함해서 전체 기록 조회 */}
          {situationTab === "사고 이력" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                  disabled={Object.values(selectedHistoryIds).filter(Boolean).length === 0}
                  onClick={handleBulkPermanentDelete}
                  style={{
                    background: "#C53030", color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 700, padding: "8px 16px",
                    cursor: Object.values(selectedHistoryIds).filter(Boolean).length === 0 ? "default" : "pointer",
                    opacity: Object.values(selectedHistoryIds).filter(Boolean).length === 0 ? 0.4 : 1,
                  }}
                >🗑️ 선택 삭제 ({Object.values(selectedHistoryIds).filter(Boolean).length})</button>
              </div>
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F7FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "10px 14px", width: 36 }}>
                        <input
                          type="checkbox"
                          checked={accidentReports.length > 0 && accidentReports.every(a => selectedHistoryIds[a.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next = {};
                            if (checked) accidentReports.forEach(a => { next[a.id] = true; });
                            setSelectedHistoryIds(next);
                          }}
                        />
                      </th>
                      {["사고 일시", "유형", "장소", "작업자", "상태"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#888", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accidentReports.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>사고 기록이 없습니다.</td></tr>
                    ) : (
                      [...accidentReports]
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .map((acc, i) => (
                          <tr key={acc.id} style={{ borderBottom: "1px solid #F7F7F7", background: i % 2 === 0 ? "#fff" : "#FAFAFA", opacity: acc.is_deleted ? 0.5 : 1 }}>
                            <td style={{ padding: "10px 14px" }}>
                              <input
                                type="checkbox"
                                checked={!!selectedHistoryIds[acc.id]}
                                onChange={(e) => setSelectedHistoryIds(prev => ({ ...prev, [acc.id]: e.target.checked }))}
                              />
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{acc.created_at ? new Date(acc.created_at).toLocaleString("ko-KR") : "-"}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111" }}>{acc.accident_type}{acc.is_deleted && <span style={{ marginLeft: 6, fontSize: 10, color: "#C53030", fontWeight: 700 }}>(삭제됨)</span>}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{acc.location}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{staffTeamMap[acc.worker_name] ? staffTeamMap[acc.worker_name] + " · " : ""}{acc.worker_name}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                                background: acc.status === "완료" ? "#F0FFF4" : "#FFF5F5",
                                color: acc.status === "완료" ? "#276749" : "#C53030",
                              }}>{acc.status || "진행중"}</span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 보고서 출력 탭 — 체크한 사고들을 한 번에 .docx로 생성/다운로드 */}
          {situationTab === "보고서 출력" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                  disabled={Object.values(selectedReportIds).filter(Boolean).length === 0 || !!bulkReportProgress}
                  onClick={handleBulkGenerateReports}
                  style={{
                    background: "#1A365D", color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 700, padding: "8px 16px",
                    cursor: (Object.values(selectedReportIds).filter(Boolean).length === 0 || bulkReportProgress) ? "default" : "pointer",
                    opacity: (Object.values(selectedReportIds).filter(Boolean).length === 0 || bulkReportProgress) ? 0.4 : 1,
                  }}
                >📄 {bulkReportProgress ? `생성 중... (${bulkReportProgress.current}/${bulkReportProgress.total})` : `선택 항목 보고서 출력 (${Object.values(selectedReportIds).filter(Boolean).length})`}</button>
              </div>
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F7FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "10px 14px", width: 36 }}>
                        <input
                          type="checkbox"
                          checked={accidentReports.filter(a => !a.is_deleted).length > 0 && accidentReports.filter(a => !a.is_deleted).every(a => selectedReportIds[a.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next = {};
                            if (checked) accidentReports.filter(a => !a.is_deleted).forEach(a => { next[a.id] = true; });
                            setSelectedReportIds(next);
                          }}
                        />
                      </th>
                      {["사고 일시", "유형", "장소", "작업자", "상태"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#888", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accidentReports.filter(a => !a.is_deleted).length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>사고 기록이 없습니다.</td></tr>
                    ) : (
                      [...accidentReports]
                        .filter(a => !a.is_deleted)
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .map((acc, i) => (
                          <tr key={acc.id} style={{ borderBottom: "1px solid #F7F7F7", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <input
                                type="checkbox"
                                checked={!!selectedReportIds[acc.id]}
                                onChange={(e) => setSelectedReportIds(prev => ({ ...prev, [acc.id]: e.target.checked }))}
                              />
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{acc.created_at ? new Date(acc.created_at).toLocaleString("ko-KR") : "-"}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111" }}>{acc.accident_type}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{acc.location}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#555" }}>{staffTeamMap[acc.worker_name] ? staffTeamMap[acc.worker_name] + " · " : ""}{acc.worker_name}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                                background: acc.status === "완료" ? "#F0FFF4" : "#FFF5F5",
                                color: acc.status === "완료" ? "#276749" : "#C53030",
                              }}>{acc.status || "진행중"}</span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 설정 탭 — 관리자 비밀번호로 잠긴 PIN 관리 도구 */}
          {situationTab === "설정" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {!settingsUnlocked ? (
                <div style={{ maxWidth: 340, margin: "60px auto 0", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>관리자 전용</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>PIN 관리 기능은 관리자 비밀번호가 필요합니다.</div>
                  <input
                    type="password"
                    value={settingsPasswordInput}
                    onChange={(e) => { setSettingsPasswordInput(e.target.value); setSettingsPasswordError(""); }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      if (settingsPasswordInput === ADMIN_SETTINGS_PASSWORD) { setSettingsUnlocked(true); setSettingsPasswordInput(""); }
                      else setSettingsPasswordError("비밀번호가 일치하지 않습니다.");
                    }}
                    placeholder="관리자 비밀번호"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: "border-box", textAlign: "center" }}
                  />
                  {settingsPasswordError && <div style={{ fontSize: 12, color: "#C53030", marginBottom: 10 }}>⚠️ {settingsPasswordError}</div>}
                  <button
                    onClick={() => {
                      if (settingsPasswordInput === ADMIN_SETTINGS_PASSWORD) { setSettingsUnlocked(true); setSettingsPasswordInput(""); }
                      else setSettingsPasswordError("비밀번호가 일치하지 않습니다.");
                    }}
                    style={{ width: "100%", padding: "10px", background: "#1A365D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >확인</button>
                </div>
              ) : (
                <>
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16, position: "relative" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>🔑 개별 PIN 설정</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
                      직원을 이름으로 검색해서 선택한 다음, 원하는 PIN(6자리)을 직접 입력해 설정합니다.
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        value={resetPinSearch}
                        onChange={(e) => {
                          setResetPinSearch(e.target.value);
                          setResetPinTargetId("");
                          setResetPinDropdownOpen(true);
                        }}
                        onFocus={() => setResetPinDropdownOpen(true)}
                        placeholder="이름으로 검색..."
                        style={{ width: "100%", padding: "9px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                      />
                      {resetPinDropdownOpen && resetPinSearch && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10,
                          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
                          maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}>
                          {staffList.filter(s => s.is_active && s.name.includes(resetPinSearch)).length === 0 ? (
                            <div style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>일치하는 직원이 없습니다.</div>
                          ) : (
                            staffList.filter(s => s.is_active && s.name.includes(resetPinSearch)).map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setResetPinTargetId(s.id);
                                  setResetPinSearch(s.name);
                                  setResetPinDropdownOpen(false);
                                }}
                                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #F7F7F7" }}
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                <span style={{ fontWeight: 700 }}>{s.name}</span>
                                <span style={{ color: "#888", marginLeft: 6 }}>({s.team || "미지정"} · {ROLE_LABEL[s.role]})</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                      <input
                        value={manualPinInput}
                        onChange={(e) => setManualPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="직접 PIN 입력 (6자리)"
                        inputMode="numeric"
                        maxLength={6}
                        style={{ flex: 1, padding: "9px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                      />
                      <button
                        disabled={!resetPinTargetId || !/^\d{6}$/.test(manualPinInput)}
                        onClick={async () => {
                          const target = staffList.find(s => s.id === resetPinTargetId);
                          if (!target) return;
                          const { error } = await supabase.from("users").update({ pin: manualPinInput }).eq("id", target.id);
                          if (error) { alert("PIN 설정에 실패했습니다: " + error.message); return; }
                          alert(`${target.name}님의 PIN이 ${manualPinInput}(으)로 설정되었습니다.`);
                          setManualPinInput("");
                          setResetPinTargetId("");
                          setResetPinSearch("");
                          loadStaff();
                        }}
                        style={{
                          background: "#EBF8FF", color: "#2B6CB0", border: "1px solid #BEE3F8", borderRadius: 8,
                          fontSize: 13, fontWeight: 700, padding: "9px 16px",
                          cursor: (resetPinTargetId && /^\d{6}$/.test(manualPinInput)) ? "pointer" : "default",
                          opacity: (resetPinTargetId && /^\d{6}$/.test(manualPinInput)) ? 1 : 0.4,
                        }}
                      >직접 설정</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
                      💡 위에서 직원을 먼저 검색·선택한 다음, 원하는 PIN을 입력하고 "직접 설정"을 누르세요.
                    </div>
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>📤 엑셀로 PIN 일괄 설정</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
                      직원 등록 때 쓰는 것과 같은 엑셀 양식에서 "전화번호"와 "PIN" 열만 읽어옵니다.
                      이미 등록된 직원의 전화번호와 매칭해서 PIN을 그 값으로 설정/변경합니다. (PIN 칸이 비어있는 행은 건너뜁니다)
                    </div>
                    <label style={{
                      display: "inline-block", fontSize: 13, padding: "9px 16px",
                      background: pinExcelUploading ? "#F7FAFC" : "#1A365D",
                      color: pinExcelUploading ? "#aaa" : "#fff",
                      border: "none", borderRadius: 8, fontWeight: 700,
                      cursor: pinExcelUploading ? "default" : "pointer",
                      marginRight: 8,
                    }}>
                      {pinExcelUploading ? "처리 중..." : "엑셀 파일 선택"}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        disabled={pinExcelUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePinExcelUpload(f); e.target.value = ""; }}
                        style={{ display: "none" }}
                      />
                    </label>
                    <a
                      href="/직원_대량등록_양식.xlsx"
                      download="직원_대량등록_양식.xlsx"
                      style={{
                        display: "inline-block", fontSize: 13, padding: "9px 16px",
                        background: "#fff", color: "#555", border: "1px solid #E2E8F0",
                        borderRadius: 8, fontWeight: 700, textDecoration: "none",
                      }}
                    >📥 양식 다운로드</a>

                    {pinExcelResults && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 13 }}>
                          <span style={{ color: "#276749", fontWeight: 700 }}>✅ 설정 완료 {pinExcelResults.success.length}명</span>
                          <span style={{ color: "#B7791F", fontWeight: 700 }}>⏭ 건너뜀 {pinExcelResults.skipped.length}명</span>
                          <span style={{ color: "#C53030", fontWeight: 700 }}>⚠️ 실패 {pinExcelResults.failed.length}명</span>
                        </div>
                        {(pinExcelResults.skipped.length > 0 || pinExcelResults.failed.length > 0) && (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                                <th style={{ padding: "4px 8px", textAlign: "left", color: "#888" }}>이름</th>
                                <th style={{ padding: "4px 8px", textAlign: "left", color: "#888" }}>전화번호</th>
                                <th style={{ padding: "4px 8px", textAlign: "left", color: "#888" }}>사유</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...pinExcelResults.skipped, ...pinExcelResults.failed].map((r, i) => (
                                <tr key={i}>
                                  <td style={{ padding: "4px 8px" }}>{r.name}</td>
                                  <td style={{ padding: "4px 8px", color: "#888" }}>{r.phone}</td>
                                  <td style={{ padding: "4px 8px", color: "#C53030" }}>{r.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {situationTab === "사고 현황" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* 사고 목록 */}
              <div style={{ width: 260, background: "#fff", borderRight: "1px solid #E2E8F0", overflowY: "auto", flexShrink: 0 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>사고 목록</span>
                </div>
                {accidentReports.filter(a => !a.is_deleted).length === 0 ? (
                  <div style={{ padding: "20px 14px", fontSize: 13, color: "#aaa", textAlign: "center" }}>사고 없음</div>
                ) : (
                  accidentReports.filter(a => !a.is_deleted).map(acc => (
                    <div key={acc.id} onClick={() => setSelectedAccident(acc)} style={{
                      padding: "12px 14px", borderBottom: "1px solid #E2E8F0", cursor: "pointer",
                      background: selectedAccident?.id === acc.id ? "#EBF8FF" : "#fff",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{acc.accident_type} 사고</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ background: acc.status === "완료" ? "#F0FFF4" : "#FFF5F5", color: acc.status === "완료" ? "#276749" : "#C53030", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: acc.status === "완료" ? "1px solid #9AE6B4" : "1px solid #FED7D7" }}>{acc.status || "진행중"}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteAccident(acc.id); }}
                            title="삭제"
                            style={{ background: "none", border: "none", color: "#CBD5E0", fontSize: 13, cursor: "pointer", padding: 2 }}
                          >🗑️</button>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                        {staffTeamMap[acc.worker_name] || "미지정"} · {acc.worker_name} · {acc.work_type}<br />{acc.location}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 상세 패널 */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* 사고 상세 정보 */}
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>📋 사고 상세 정보</div>
                  <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "12px" }}>
                    {[
                      ["사고 일시", selectedAccident?.created_at ? new Date(selectedAccident.created_at).toLocaleString("ko-KR") : "-"],
                      ["사고 장소", selectedAccident?.location || "-"],
                      ["사고 유형", selectedAccident?.accident_type || "-"],
                      ["사고 내용", selectedAccident?.content || "-"],
                      ["작업자", selectedAccident ? `${staffTeamMap[selectedAccident.worker_name] ? staffTeamMap[selectedAccident.worker_name] + " · " : ""}${selectedAccident.worker_name || "-"}` : "-"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 13 }}>
                        <span style={{ color: "#888", minWidth: 60, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: "#111", fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {/* 첨부 사진 — 클릭하면 확대 */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>첨부 사진</div>
                    {(selectedAccident?.photo_urls || []).length === 0 ? (
                      <div style={{ fontSize: 12, color: "#aaa" }}>등록된 사진이 없습니다.</div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {selectedAccident.photo_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`첨부 사진 ${i + 1}`}
                            onClick={() => setLightboxUrl(url)}
                            style={{ width: 80, height: 62, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "1px solid #E2E8F0" }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 상황실 공유 — TBM 확인 / 피재자 상태 확인 / 추가 공유 (작업자·상급자 화면에 동시 전달) */}
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>📣 현장 공유</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: situationShareType ? 12 : 0 }}>
                    {SITUATION_SHARE_TYPES.map(t => (
                      <button
                        key={t.key}
                        disabled={!selectedAccident}
                        onClick={() => { setSituationShareType(t.key); setSituationShareText(""); setSituationSharePhoto(null); }}
                        style={{
                          flex: 1, padding: "10px 6px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: selectedAccident ? "pointer" : "default",
                          background: situationShareType === t.key ? "#EBF8FF" : "#F7FAFC",
                          border: `1px solid ${situationShareType === t.key ? "#2B6CB0" : "#E2E8F0"}`,
                          color: situationShareType === t.key ? "#2B6CB0" : "#444",
                          opacity: selectedAccident ? 1 : 0.5,
                        }}
                      >{t.icon} {t.label}</button>
                    ))}
                  </div>

                  {situationShareType && (
                    <div style={{ background: "#F7FAFC", borderRadius: 8, padding: 10 }}>
                      <textarea
                        value={situationShareText}
                        onChange={(e) => setSituationShareText(e.target.value)}
                        placeholder={`${SITUATION_SHARE_TYPES.find(t => t.key === situationShareType)?.label} 내용을 입력하세요`}
                        style={{
                          width: "100%", minHeight: 70, padding: "8px 10px", border: "1px solid #E2E8F0",
                          borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box",
                          fontFamily: "inherit", outline: "none", marginBottom: 8,
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <label style={{
                          fontSize: 12, padding: "6px 10px", background: "#fff", border: "1px solid #E2E8F0",
                          borderRadius: 6, cursor: "pointer", color: "#444",
                        }}>
                          📷 사진 첨부
                          <input
                            type="file" accept="image/*" style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setSituationSharePhoto({ file: f, previewUrl: URL.createObjectURL(f) });
                            }}
                          />
                        </label>
                        {situationSharePhoto && (
                          <div style={{ position: "relative" }}>
                            <img src={situationSharePhoto.previewUrl} alt="첨부 미리보기" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #E2E8F0" }} />
                            <button
                              onClick={() => setSituationSharePhoto(null)}
                              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#C53030", color: "#fff", border: "none", fontSize: 11, cursor: "pointer", lineHeight: "18px", padding: 0 }}
                            >×</button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { setSituationShareType(null); setSituationShareText(""); setSituationSharePhoto(null); }}
                          style={{ flex: 1, padding: "9px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#666" }}
                        >취소</button>
                        <button
                          disabled={situationShareSending}
                          onClick={handleSendSituationShare}
                          style={{ flex: 2, padding: "9px", background: "#2B6CB0", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#fff", cursor: situationShareSending ? "default" : "pointer", opacity: situationShareSending ? 0.6 : 1 }}
                        >{situationShareSending ? "전송 중..." : "전송 (작업자·상급자에게 전달)"}</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 출동 지정 */}
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>출동 지정</div>
                  {(() => {
                    const dispatchable = staffList.filter(s => s.role === "situation" && s.is_active);
                    const teamOptions = ["전체", ...Array.from(new Set(dispatchable.map(s => s.team).filter(Boolean)))];
                    const filtered = dispatchTeamFilter === "전체" ? dispatchable : dispatchable.filter(s => s.team === dispatchTeamFilter);
                    return (
                      <>
                        {teamOptions.length > 1 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                            {teamOptions.map(team => (
                              <button
                                key={team}
                                onClick={() => setDispatchTeamFilter(team)}
                                style={{
                                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                                  background: dispatchTeamFilter === team ? "#2B6CB0" : "#F7FAFC",
                                  color: dispatchTeamFilter === team ? "#fff" : "#555",
                                  border: `1px solid ${dispatchTeamFilter === team ? "#2B6CB0" : "#E2E8F0"}`,
                                }}
                              >{team}</button>
                            ))}
                          </div>
                        )}
                        {filtered.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#aaa", padding: "10px 0" }}>
                            {dispatchable.length === 0
                              ? '등록된 상황실 직원이 없습니다. "직원 관리"에서 역할을 "상황실"로 추가해주세요.'
                              : "해당 팀에 등록된 직원이 없습니다."}
                          </div>
                        ) : (
                          filtered.map(m => (
                            <div key={m.id} onClick={() => !dispatchedMembers[m.id] && setSelectedMember(m)} style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "8px 10px", borderRadius: 8, cursor: dispatchedMembers[m.id] ? "default" : "pointer",
                              border: "1px solid " + (selectedMember?.id === m.id ? "#2B6CB0" : dispatchedMembers[m.id] ? "#9AE6B4" : "#E2E8F0"),
                              background: selectedMember?.id === m.id ? "#EBF8FF" : dispatchedMembers[m.id] ? "#F0FFF4" : "#fff",
                              marginBottom: 6,
                            }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{m.name}</div>
                                <div style={{ fontSize: 11, color: "#888" }}>{m.team ? m.team + " · " : ""}{m.phone}</div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: dispatchedMembers[m.id] ? "#276749" : selectedMember?.id === m.id ? "#2B6CB0" : "#aaa" }}>
                                {dispatchedMembers[m.id] ? "출동" : selectedMember?.id === m.id ? "선택됨" : "클릭하여 선택"}
                              </span>
                            </div>
                          ))
                        )}
                      </>
                    );
                  })()}
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
                    tlEvents.map(renderTimelineEvent)
                  )}
                </div>
              </div>

              {/* 상황 종료 버튼 */}
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                <button
                  onClick={async () => {
                    if(!window.confirm("상황을 종료하시겠습니까?")) return;
                    if (!selectedAccident) return;
                    // 선택된 사고만 status 완료로 변경 (다른 진행중 사고에는 영향 없음)
                    await supabase.from("accident_reports")
                      .update({ status: "완료" })
                      .eq("id", selectedAccident.id);
                    // 해당 사고의 작업자/상급자에게만 알람
                    await supabase.from("directives").insert({
                      accident_id: selectedAccident.id,
                      action_key: "상황종료",
                      action_label: "상황 종료",
                      message: "모든 조치가 완료되었습니다. 상황을 종료합니다.",
                      supervisor_name: "안전 상황실",
                    });
                    // 사고 목록 갱신 - state 즉시 업데이트
                    setAccidentReports(prev => prev.map(a =>
                      a.id === selectedAccident.id ? {...a, status: "완료"} : a
                    ));
                    setSelectedAccident(prev => prev ? {...prev, status: "완료"} : prev);
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
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>{GlobalOverlay()}
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
      {NotifBanner()}
      {NotifPopup()}
    </>
  );
}

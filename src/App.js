import { useState } from "react";

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
  SUPERVISOR: "supervisor",
  TIMELINE: "timeline",
  SITUATION_ROOM: "situation_room",       // 상황실 — 전체 사고 목록
  SITUATION_DETAIL: "situation_detail",   // 상황실 — 개별 사고 상세
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
    content: "[중대재해 1차 보고]\n- 일시: 06/25 14:35\n- 장소: 서산 대산공장\n- 유형: 추락\n- 현장 작업자: 김철수\n\n즉시 확인 바랍니다.\n(안전관리시스템)",
    color: "#E53E3E",
  },
  {
    step: "2차 보고",
    from: "팀장 → 차장",
    time: "14:37",
    content: "[중대재해 2차 보고]\n- 일시: 06/25 14:35\n- 장소: 서산 대산공장\n- 유형: 추락\n- 팀장 확인 완료\n\n지시 및 조치 바랍니다.\n(안전관리시스템)",
    color: "#DD6B20",
  },
  {
    step: "3차 보고",
    from: "차장 → 부장",
    time: "14:39",
    content: "[중대재해 3차 보고]\n- 일시: 06/25 14:35\n- 장소: 서산 대산공장\n- 유형: 추락\n- 현재 조치율: 60%\n\n확인 후 지시 바랍니다.\n(안전관리시스템)",
    color: "#2B6CB0",
  },
  {
    step: "상황실 알림",
    from: "→ 상황실",
    time: "14:40",
    content: "[중대재해 상황 알림]\n- 사고 ID: 2024-0625-001\n- 유형: 추락\n- 장소: 서시 대산공장\n- 현재 단계: 2차 보고\n\n상황실에서 확인 바랍니다.\n(안전관리시스템)",
    color: "#553C9A",
  },
];

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
  const [accidentDate] = useState("2024.06.25 (화) 14:35");
  const [accidentContent, setAccidentContent] = useState("옥외 배관 점검 중 난간 파손으로 추락");
  const [hasInjured, setHasInjured] = useState(true);
  const [injuredName, setInjuredName] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(false);
  const [checkedRecipients, setCheckedRecipients] = useState([]);
  const [actionStatus, setActionStatus] = useState({
    stop: "idle",      // idle | done | partial
    control: "idle",
    report119: "idle",
  });
  const [actionTimes, setActionTimes] = useState({}); // 조치 항목별 마지막 상태변경 시각
  // 세부 체크리스트 항목별 체크여부/체크시각 (key: "stop-0" 형태)
  const [subItemChecked, setSubItemChecked] = useState({});
  const [subItemTimes, setSubItemTimes] = useState({});
  // 상급자 체크리스트 state
  const [checklistDone, setChecklistDone] = useState({
    작업중지: false, 현장통제: false, 신고119: false, 응급조치: false, 현장보존: false,
  });
  const [activeDirective, setActiveDirective] = useState(null);
  const [directiveTexts, setDirectiveTexts] = useState({});
  const [directiveEditing, setDirectiveEditing] = useState({});
  const [directiveSent, setDirectiveSent] = useState({});
  const [directiveTimes, setDirectiveTimes] = useState({});   // 지시 전송 시각
  // 현장작업자 조치 체크리스트
  const [workerChecklist, setWorkerChecklist] = useState({
    대피: false, 연락: false, 응급: false, 통제: false, 보존: false,
  });
  const [workerCheckTimes, setWorkerCheckTimes] = useState({});

  // ── 상황실 state ──────────────────────────────────────
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [situationFilter, setSituationFilter] = useState("전체");
  const [dispatchState, setDispatchState] = useState({});   // 출동 지시 상태 {key: "HH:MM"}
  // 보고 수신자별 확인 시각 (key: 이름, value: "HH:MM" 또는 null)
  const [reportConfirmed, setReportConfirmed] = useState({
    "김철수 작업자": "14:36",  // 1차 — 이미 접수됨
    "김현당 팀장": null,
    "이인판 차장": null,
    "박관리 부장": null,
    "안전상황실": null,
  });
  const [isMock, setIsMock] = useState(false);

  const go = (s) => setScreen(s);

  // 현재 workType에 맞는 보고 대상 목록
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

  // ── 화면 00: 로그인 ──────────────────────────────────
  if (screen === SCREENS.LOGIN) {

    // DB 연동 전 더미 사용자 데이터 (전화번호 → 역할 매핑)
    const DUMMY_USERS = {
      "01012345678": { role: "worker",     name: "김철수",   team: "충청1팀", workType: "유지보수" },
      "01023456789": { role: "supervisor", name: "김현당",   team: "충청1팀", position: "팀장" },
      "01056781234": { role: "supervisor", name: "최유지",   team: "유지보수팀", position: "과장" },
      "01023456780": { role: "situation",  name: "이인판",   team: "안전관리팀", position: "차장" },
    };

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

    const handleSendCode = () => {
      const digits = phoneNum.replace(/\D/g, "");
      if (digits.length !== 11) {
        setPhoneError("올바른 핸드폰 번호를 입력해주세요.");
        return;
      }
      if (!DUMMY_USERS[digits]) {
        setPhoneError("등록되지 않은 번호입니다. 관리자에게 문의하세요.");
        return;
      }
      setPhoneError("");
      setCodeSent(true);
      setLoginStep("verify");
      setVerifyCode("");
    };

    const handleVerify = () => {
      // 프로토타입: 123456 고정 인증번호
      if (verifyCode !== "123456") {
        setVerifyError("인증번호가 일치하지 않습니다. 다시 확인해주세요.");
        return;
      }
      const digits = phoneNum.replace(/\D/g, "");
      const user = DUMMY_USERS[digits];
      setUserRole(user.role);
      if (user.workType) setWorkType(user.workType);
      if (user.role === "worker")     go(SCREENS.MAIN);
      if (user.role === "supervisor") go(SCREENS.SUPERVISOR);
      if (user.role === "situation")  go(SCREENS.SITUATION_ROOM);
    };

    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>

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

              {/* 인증번호 박스 6칸 */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
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

              {/* 숨겨진 실제 입력 필드 */}
              <input
                type="number"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => {
                  const v = e.target.value.slice(0, 6);
                  setVerifyCode(v);
                  setVerifyError("");
                  if (v.length === 6) {
                    // 자동 인증 시도
                    setTimeout(() => {
                      if (v !== "123456") {
                        setVerifyError("인증번호가 일치하지 않습니다.");
                      } else {
                        const digits = phoneNum.replace(/\D/g, "");
                        const DUMMY_USERS = {
                          "01012345678": { role: "worker",     workType: "유지보수" },
                          "01023456789": { role: "supervisor", workType: null },
                          "01056781234": { role: "supervisor", workType: null },
                          "01023456780": { role: "situation",  workType: null },
                        };
                        const user = DUMMY_USERS[digits];
                        setUserRole(user.role);
                        if (user.workType) setWorkType(user.workType);
                        if (user.role === "worker")     go(SCREENS.MAIN);
                        if (user.role === "supervisor") go(SCREENS.SUPERVISOR);
                        if (user.role === "situation")  go(SCREENS.SITUATION_ROOM);
                      }
                    }, 200);
                  }
                }}
                style={{
                  position: "absolute", opacity: 0, width: 1, height: 1,
                  pointerEvents: "none",
                }}
              />

              {/* 키패드 대용 — 탭하면 input 포커스 */}
              <div
                onClick={() => document.querySelector('input[type="number"]')?.focus()}
                style={{
                  textAlign: "center", fontSize: 12, color: "#888",
                  marginBottom: 12, cursor: "pointer",
                  padding: "8px", border: "1px dashed #E2E8F0", borderRadius: 8,
                }}
              >📱 위 칸을 탭하여 키패드 열기</div>

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
      <div style={styles.phone}>
        <div style={styles.statusBar}>
          <span>9:41</span>
          <span>📶 🔋</span>
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
            onClick={() => { setIsMock(true); go(SCREENS.ACCIDENT_TYPE); }}
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

          {/* 긴급 연락처 */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F7F7F7",
            borderRadius: 12,
            padding: "12px 16px",
          }}>
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
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.MAIN)}>‹</button>
          <span style={styles.headerTitle}>사고 유형 선택</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>취소</button>
        </div>
        <div style={{ ...styles.body }}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>해당되는 사고 유형을 선택하세요.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {acidentTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                style={{
                  background: selectedType === t.id ? "#FFF5F5" : "#FAFAFA",
                  border: `2px solid ${selectedType === t.id ? "#E53E3E" : "#EFEFEF"}`,
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
    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.ACCIDENT_TYPE)}>‹</button>
          <span style={styles.headerTitle}>사고 위치 확인</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>취소</button>
        </div>
        <div style={styles.body}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>GPS가 자동으로 위치를 확인합니다.</p>
          {/* 지도 영역 */}
          <div style={{
            background: "#E8F0E8",
            borderRadius: 12,
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            marginBottom: 16,
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(0,0,0,0.04) 20px,rgba(0,0,0,0.04) 21px), repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(0,0,0,0.04) 20px,rgba(0,0,0,0.04) 21px)",
            }} />
            <div style={{ fontSize: 36, zIndex: 1 }}>📍</div>
          </div>
          {/* 위치 정보 */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>충청남도 서산시 대산읍</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>위도 36.7842  경도 126.4321</div>
          </div>
          {/* 위치 확인 체크 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#F0FFF4",
            border: "1px solid #9AE6B4",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 24,
          }}>
            <span style={{ color: "#2F855A", fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 14, color: "#2F855A", fontWeight: 600 }}>위치 정보가 올바릅니까?</span>
          </div>
          {/* 버튼 2개 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button style={{
              flex: 1, padding: "14px", background: "#fff", border: "1.5px solid #ddd",
              borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#333",
            }}>아니요, 다시 설정</button>
          </div>
          <button style={styles.redBtn} onClick={() => go(SCREENS.DETAILS)}>다음</button>
        </div>
      </div>
    );
  }

  // ── 화면 04: 사고 내용 입력 ──────────────────────────
  if (screen === SCREENS.DETAILS) {
    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.LOCATION)}>‹</button>
          <span style={styles.headerTitle}>사고 내용 입력</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>취소</button>
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
    const MOCK_PHOTOS = [
      { id: 1, emoji: "🏗️", bg: "#4A5568" },
      { id: 2, emoji: "🏭", bg: "#718096" },
    ];

    const handleAddPhoto = () => {
      const newId = Date.now();
      const options = [
        { emoji: "📸", bg: "#2D6A4F" },
        { emoji: "🔧", bg: "#1A535C" },
        { emoji: "⚠️", bg: "#774936" },
      ];
      const pick = options[uploadedPhotos.length % options.length];
      setUploadedPhotos((prev) => [...prev, { id: newId, ...pick }]);
      setPhotoError(false);
    };

    const handleRemovePhoto = (id) => {
      setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    const allPhotos = [...MOCK_PHOTOS, ...uploadedPhotos];
    const canProceed = allPhotos.length >= 1;

    const handleNext = () => {
      if (!canProceed) { setPhotoError(true); return; }
      setPhotoError(false);
      go(SCREENS.RECIPIENTS);
    };

    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.DETAILS)}>‹</button>
          <span style={styles.headerTitle}>사진/동영상 등록</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>취소</button>
        </div>
        <div style={styles.body}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
            사고 현장 사진 또는 동영상을 등록해주세요.
          </p>
          {/* 필수 안내 뱃지 */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#FFF5F5", border: "1px solid #FED7D7",
            borderRadius: 6, padding: "5px 10px", marginBottom: 16,
          }}>
            <span style={{ color: "#E53E3E", fontSize: 13 }}>📌</span>
            <span style={{ fontSize: 12, color: "#C53030", fontWeight: 600 }}>최소 1장 이상 등록 필수</span>
          </div>

          {/* 카메라 버튼 */}
          <button
            onClick={handleAddPhoto}
            style={{
              width: "100%", border: `2px dashed ${photoError ? "#E53E3E" : "#ddd"}`,
              borderRadius: 12, padding: "22px", textAlign: "center",
              marginBottom: 16, cursor: "pointer",
              background: photoError ? "#FFF5F5" : "#FAFAFA",
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 14, color: photoError ? "#E53E3E" : "#666", fontWeight: 600 }}>
              사진 촬영 / 갤러리에서 선택
            </div>
          </button>

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
                {allPhotos.map((p, i) => (
                  <div key={p.id} style={{ position: "relative" }}>
                    <div style={{
                      width: 100, height: 82, background: p.bg,
                      borderRadius: 10, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 24, color: "#fff",
                    }}>{p.emoji}</div>
                    {/* 삭제 버튼 — 목 사진(처음 2장) 은 삭제 불가 */}
                    {i >= 2 && (
                      <button
                        onClick={() => handleRemovePhoto(p.id)}
                        style={{
                          position: "absolute", top: -6, right: -6,
                          width: 22, height: 22, borderRadius: "50%",
                          background: "#E53E3E", border: "2px solid #fff",
                          color: "#fff", fontSize: 13, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1, fontWeight: 700,
                        }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 추가 버튼 */}
          <button
            onClick={handleAddPhoto}
            style={{
              width: "100%", padding: "13px", background: "#fff",
              border: "1.5px solid #ddd", borderRadius: 10, fontSize: 15,
              fontWeight: 600, cursor: "pointer", color: "#555", marginBottom: 20,
            }}
          >+ 추가 사진/동영상</button>

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
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.WORKER_TIMELINE)}>‹</button>
          <span style={styles.headerTitle}>긴급 조치 현황 입력</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>취소</button>
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
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.PHOTOS)}>‹</button>
          <span style={styles.headerTitle}>보고 대상 확인</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>취소</button>
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
              onClick={() => canSend && go(SCREENS.COMPLETE)}
            >전송</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 화면 07: 보고 완료 ──────────────────────────────
  if (screen === SCREENS.COMPLETE) {
    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* 완료 아이콘 */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "#E53E3E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, color: "#fff", marginBottom: 20,
          }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8, textAlign: "center" }}>
            1차 보고가 완료되었습니다.
          </div>
          <div style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
            보고 내용이 등록되었으며,<br />지정된 대상자에게 전송되었습니다.
          </div>

          {/* 다음 단계 안내 카드 */}
          <div style={{
            width: "100%", background: "#FFF5F5", border: "1px solid #FED7D7",
            borderRadius: 12, padding: "16px",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⏳</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#C53030", marginBottom: 4 }}>
                다음 단계: 긴급 조치 현황 입력
              </div>
              <div style={{ fontSize: 12, color: "#744210", lineHeight: 1.6 }}>
                작업 중지, 현장 통제, 119 신고 등 현재까지 진행된 조치를 입력해주세요. 조치/미조치를 확인할 때마다 시각이 자동으로 기록됩니다.
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 24px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            style={{
              width: "100%", padding: "15px", background: "#E53E3E",
              border: "none", borderRadius: 12, fontSize: 16,
              fontWeight: 700, cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onClick={() => go(SCREENS.ACTIONS)}
          >🚨 긴급 조치 현황 입력하기</button>
          <button
            style={{
              width: "100%", padding: "15px", background: "#1A365D",
              border: "none", borderRadius: 12, fontSize: 15,
              fontWeight: 700, cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onClick={() => go(SCREENS.WORKER_TIMELINE)}
          >📊 보고 현황 바로 보기</button>
          <button style={{
            width: "100%", padding: "13px", background: "#fff",
            border: "1.5px solid #ddd", borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: "pointer", color: "#666",
          }} onClick={() => go(SCREENS.MAIN)}>홈으로 이동</button>
        </div>
      </div>
    );
  }

  // ── 화면 07-B: 현장작업자 보고현황 (타임라인 + 상급자 조치 지시) ─
  if (screen === SCREENS.WORKER_TIMELINE) {

    const SUPERVISOR_ITEMS = [
      { key: "작업중지", icon: "🚫", color: "#C53030", label: "작업중지 지시" },
      { key: "현장통제", icon: "🚧", color: "#B7791F", label: "현장 통제 (출입 통제)" },
      { key: "신고119",  icon: "🚑", color: "#2B6CB0", label: "119 신고" },
      { key: "응급조치", icon: "🏥", color: "#6B46C1", label: "응급조치 / 병원 이송" },
      { key: "현장보존", icon: "🔒", color: "#276749", label: "현장 보존 조치" },
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

    const allEvents = [...fixedEvents, ...workerActionEvents, ...sentDirectives, ...pendingDirectives];

    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.COMPLETE)}>‹</button>
          <span style={styles.headerTitle}>보고 현황</span>
          <button style={styles.cancelBtn} onClick={() => go(SCREENS.MAIN)}>홈</button>
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

  // ── 화면 08: 상급자 확인 화면 ────────────────────────
  if (screen === SCREENS.SUPERVISOR) {

    const CHECKLIST_ITEMS = [
      {
        key: "작업중지",
        label: "작업중지 지시",
        defaultMsg: `[작업중지 지시]\n\n2024.06.25 14:35 발생한 추락 사고와 관련하여\n현장 내 모든 작업을 즉시 중지하시기 바랍니다.\n\n- 진행 중인 모든 작업 즉시 중단\n- 작업자 안전지대로 대피\n- 추가 지시 있을 때까지 대기\n\n(안전관리시스템)`,
      },
      {
        key: "현장통제",
        label: "현장 통제 (출입 통제)",
        defaultMsg: `[현장 출입 통제 지시]\n\n2024.06.25 14:35 사고 현장에 대한\n즉각적인 출입 통제를 실시하시기 바랍니다.\n\n- 사고 구역 접근 전면 차단\n- 통제선 설치 및 안내 요원 배치\n- 허가된 인원 외 출입 금지\n\n(안전관리시스템)`,
      },
      {
        key: "신고119",
        label: "119 신고",
        defaultMsg: `[119 신고 요청]\n\n2024.06.25 14:35 충청남도 서산시 대산읍\n현장에서 추락 사고가 발생하였습니다.\n\n- 부상자 발생 (응급 처치 필요)\n- 119 즉시 신고 요청\n- 구급대 도착 전까지 응급 처치 유지\n\n(안전관리시스템)`,
      },
      {
        key: "응급조치",
        label: "응급조치 / 병원 이송",
        defaultMsg: `[응급조치 및 병원 이송 지시]\n\n부상자에 대한 즉각적인 응급조치 및\n병원 이송을 지시합니다.\n\n- 현장 응급 처치 즉시 시행\n- 인근 응급실로 신속 이송\n- 이송 병원 및 상태 보고 요망\n\n(안전관리시스템)`,
      },
      {
        key: "현장보존",
        label: "현장 보존 조치",
        defaultMsg: `[현장 보존 지시]\n\n사고 조사를 위한 현장 보존을\n철저히 유지하시기 바랍니다.\n\n- 사고 현장 원형 그대로 보존\n- 장비·자재 이동 금지\n- 사진 및 영상 추가 기록 요망\n- 목격자 확보 및 대기\n\n(안전관리시스템)`,
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

    const handleSend = (key) => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      setDirectiveSent((prev) => ({ ...prev, [key]: true }));
      setDirectiveTimes((prev) => ({ ...prev, [key]: hhmm }));
      setChecklistDone((prev) => ({ ...prev, [key]: true }));
      setActiveDirective(null);
      setDirectiveEditing((prev) => ({ ...prev, [key]: false }));
    };

    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.COMPLETE)}>‹</button>
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
              const done = checklistDone[item.key];
              const isOpen = activeDirective === item.key;
              const isEditing = directiveEditing[item.key];
              const text = directiveTexts[item.key] || item.defaultMsg;
              const sent = directiveSent[item.key];

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
                      {done ? "✓ 전송완료" : isOpen ? "닫기" : "지시하기"}
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

            {/* 전체 완료 버튼 */}
            <button
              onClick={() => {
                const all = {};
                CHECKLIST_ITEMS.forEach(({ key }) => { all[key] = true; });
                setChecklistDone(all);
                setActiveDirective(null);
              }}
              style={{
                ...styles.redBtn, marginTop: 10, padding: "11px", fontSize: 14,
                background: allDone ? "#2F855A" : "#E53E3E",
              }}
            >
              {allDone ? "✓ 모든 지시 완료" : "전체 완료 처리"}
            </button>
          </div>

          {/* ── 보고 및 알림 — 실시간 확인 시각 ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>보고 및 알림</div>
            {[
              { step: "1차 보고", role: "현장 작업자", name: "김철수 작업자", sent: "14:36" },
              { step: "2차 보고", role: "현장책임자",  name: "김현당 팀장",   sent: "14:37" },
              { step: "3차 보고", role: "안전관리자",  name: "이인판 차장",   sent: "14:39" },
              { step: "4차 보고", role: "사업당 관리자", name: "박관리 부장", sent: "14:40" },
              { step: "상황실",   role: "상황실",       name: "안전상황실",   sent: "14:40" },
            ].map((r) => {
              const confirmed = reportConfirmed[r.name];
              return (
                <div key={r.name} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid #F0F0F0",
                }}>
                  {/* 상태 아이콘 */}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: confirmed ? "#E53E3E" : "#EDF2F7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, color: confirmed ? "#fff" : "#A0AEC0",
                  }}>{confirmed ? "✓" : "○"}</div>

                  {/* 이름/역할 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{r.step} · {r.role}</div>
                  </div>

                  {/* 시각 정보 */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "#aaa" }}>발송 {r.sent}</div>
                    {confirmed
                      ? <div style={{ fontSize: 12, fontWeight: 700, color: "#E53E3E", marginTop: 1 }}>확인 {confirmed}</div>
                      : <button
                          onClick={() => {
                            const now = new Date();
                            const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
                            setReportConfirmed((prev) => ({ ...prev, [r.name]: hhmm }));
                          }}
                          style={{
                            marginTop: 3, background: "#F7FAFC", border: "1px solid #CBD5E0",
                            borderRadius: 5, padding: "2px 8px", fontSize: 11,
                            color: "#555", cursor: "pointer", fontWeight: 600,
                          }}
                        >확인</button>
                    }
                  </div>
                </div>
              );
            })}
          </div>

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
            📊 보고 현황 전체 보기
          </button>
        </div>
      </div>
    );
  }

  // ── 화면 08-B: 보고 현황 타임라인 ────────────────────
  if (screen === SCREENS.TIMELINE) {

    const CHECKLIST_META = [
      { key: "작업중지", label: "작업중지 지시",          icon: "🚫", color: "#C53030" },
      { key: "현장통제", label: "현장 통제 (출입 통제)",  icon: "🚧", color: "#B7791F" },
      { key: "신고119",  label: "119 신고",               icon: "🚑", color: "#2B6CB0" },
      { key: "응급조치", label: "응급조치 / 병원 이송",   icon: "🏥", color: "#6B46C1" },
      { key: "현장보존", label: "현장 보존 조치",          icon: "🔒", color: "#276749" },
    ];

    // 고정 이벤트 (사고 발생 + 보고 접수)
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
        title: "1차 보고 접수",
        desc: "김철수 작업자 → 김현당 팀장",
        sub: "사고 내용 및 사진 첨부 포함",
        pending: false,
      },
    ];

    // 체크리스트 이벤트 — 전송된 것 + 미전송 항목
    const checklistEvents = CHECKLIST_META.map((meta) => {
      const sent = directiveSent[meta.key];
      const time = directiveTimes[meta.key] || null;
      return {
        time,
        icon: meta.icon,
        color: sent ? meta.color : "#A0AEC0",
        title: meta.label,
        desc: sent ? "지시 문자 전송 완료 · 김현당 팀장" : "미전송",
        sub: sent ? `수신자 확인 대기 중` : "아직 지시하기 전",
        pending: !sent,
      };
    });

    // 전송된 것 시간순 + 미전송 원래 순서 유지
    const sentEvents = checklistEvents
      .filter(e => !e.pending)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const pendingEvents = checklistEvents.filter(e => e.pending);
    const allEvents = [...fixedEvents, ...sentEvents, ...pendingEvents];

    const sentCount = checklistEvents.filter(e => !e.pending).length;
    const totalCount = CHECKLIST_META.length;

    return (
      <div style={styles.phone}>
        <div style={styles.statusBar}><span>9:41</span><span>📶 🔋</span></div>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => go(SCREENS.SUPERVISOR)}>‹</button>
          <span style={styles.headerTitle}>보고 현황</span>
          <span />
        </div>
        <div style={styles.body}>

          {/* 사고 요약 카드 */}
          <div style={{
            background: "#FFF5F5", border: "1px solid #FED7D7",
            borderRadius: 10, padding: "12px 14px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: "#C53030", fontWeight: 700, marginBottom: 6 }}>📌 사고 기본 정보</div>
            {[
              ["일시", "2024.06.25 (화) 14:35"],
              ["장소", "충청남도 서산시 대산읍"],
              ["유형", "추락"],
              ["부상자", "있음"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 10, fontSize: 13, padding: "2px 0" }}>
                <span style={{ color: "#888", minWidth: 36 }}>{k}</span>
                <span style={{ color: "#111", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* 조치 진행률 */}
          <div style={{
            background: "#F7FAFC", border: "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px 14px", marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>조치 지시 현황</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: sentCount === totalCount ? "#276749" : "#E53E3E" }}>
                {sentCount}/{totalCount} 완료
              </span>
            </div>
            <div style={{ height: 7, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, transition: "width 0.4s ease",
                width: `${(sentCount / totalCount) * 100}%`,
                background: sentCount === totalCount ? "#38A169" : "#E53E3E",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#888" }}>전송 완료 {sentCount}건</span>
              <span style={{ fontSize: 11, color: "#aaa" }}>미전송 {totalCount - sentCount}건</span>
            </div>
          </div>

          {/* 타임라인 */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 14 }}>진행 타임라인</div>
          <div style={{ position: "relative" }}>
            {/* 세로 연결선 */}
            <div style={{
              position: "absolute", left: 15, top: 16, bottom: 16,
              width: 2, background: "#E2E8F0", zIndex: 0,
            }} />

            {allEvents.map((ev, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, marginBottom: 20,
                position: "relative", zIndex: 1,
              }}>
                {/* 아이콘 원 */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: ev.pending ? "#F0F4F8" : ev.color,
                  border: `2px solid ${ev.pending ? "#CBD5E0" : ev.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, zIndex: 2,
                }}>{ev.icon}</div>

                {/* 텍스트 */}
                <div style={{
                  flex: 1, paddingTop: 2,
                  background: ev.pending ? "transparent" : "#fff",
                  border: ev.pending ? "none" : `1px solid ${ev.color}22`,
                  borderRadius: ev.pending ? 0 : 10,
                  padding: ev.pending ? "2px 0" : "10px 12px",
                  opacity: ev.pending ? 0.5 : 1,
                }}>
                  {/* 제목 + 시각 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ev.pending ? 2 : 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ev.pending ? "#A0AEC0" : "#111" }}>
                      {ev.title}
                    </span>
                    {ev.time
                      ? <span style={{
                          fontSize: 12, fontWeight: 800, color: ev.color,
                          background: `${ev.color}18`, borderRadius: 6,
                          padding: "2px 7px", flexShrink: 0,
                        }}>{ev.time}</span>
                      : <span style={{ fontSize: 11, color: "#CBD5E0", flexShrink: 0 }}>미전송</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: ev.pending ? "#CBD5E0" : "#555" }}>{ev.desc}</div>
                  {!ev.pending && ev.sub && (
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{ev.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 미전송 항목 안내 */}
          {pendingEvents.length > 0 && (
            <div style={{
              background: "#FFFBEB", border: "1px solid #F6E05E",
              borderRadius: 10, padding: "12px 14px", marginTop: 4,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#B7791F", marginBottom: 4 }}>
                  미전송 조치 {pendingEvents.length}건
                </div>
                <div style={{ fontSize: 12, color: "#744210", lineHeight: 1.6 }}>
                  {pendingEvents.map(e => e.title).join(", ")} 지시가 아직 전송되지 않았습니다. 조치 지시 체크리스트에서 확인해주세요.
                </div>
              </div>
            </div>
          )}

          {pendingEvents.length === 0 && (
            <div style={{
              background: "#F0FFF4", border: "1px solid #9AE6B4",
              borderRadius: 10, padding: "12px 14px", marginTop: 4,
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#276749" }}>
                모든 조치 지시가 완료되었습니다.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 화면 09: 문자 알림 예시 ──────────────────────────
  // ── 화면 SR: 상황실 — 전체 사고 목록 ────────────────
  if (screen === SCREENS.SITUATION_ROOM) {

    const ACCIDENTS = [
      {
        id: "2024-0625-001",
        type: "추락", icon: "🧗",
        location: "충청남도 서산시 대산읍",
        worker: "김철수 작업자",
        team: "충청1팀",
        workType: "유지보수",
        occurredAt: "2024.06.25 14:35",
        status: "진행중",
        reportStep: "2차 보고",
        injured: true,
        directives: { 작업중지: true, 현장통제: true, 신고119: false, 응급조치: false, 현장보존: false },
        timeline: [
          { time: "14:35", event: "사고 발생", desc: "옥외 배관 점검 중 난간 파손으로 추락", color: "#E53E3E" },
          { time: "14:36", event: "1차 보고 접수", desc: "김철수 작업자 → 김현당 팀장", color: "#E53E3E" },
          { time: "14:37", event: "작업중지 지시", desc: "김현당 팀장 발신 완료", color: "#C53030" },
          { time: "14:38", event: "현장통제 지시", desc: "김현당 팀장 발신 완료", color: "#B7791F" },
        ],
      },
      {
        id: "2024-0620-001",
        type: "감전", icon: "⚡",
        location: "충청남도 천안시 서북구",
        worker: "이민준 작업자",
        team: "충청2팀",
        workType: "운용투자",
        occurredAt: "2024.06.20 10:12",
        status: "완료",
        reportStep: "4차 보고",
        injured: false,
        directives: { 작업중지: true, 현장통제: true, 신고119: true, 응급조치: true, 현장보존: true },
        timeline: [
          { time: "10:12", event: "사고 발생", desc: "배전반 점검 중 감전", color: "#E53E3E" },
          { time: "10:14", event: "1차 보고 접수", desc: "이민준 작업자 → 박팀장", color: "#E53E3E" },
          { time: "10:16", event: "전체 조치 완료", desc: "5개 항목 모두 지시 완료", color: "#276749" },
        ],
      },
      {
        id: "2024-0618-002",
        type: "낙하/비래", icon: "🪨",
        location: "충청남도 공주시 반포면",
        worker: "박성우 작업자",
        team: "충청3팀",
        workType: "유지보수",
        occurredAt: "2024.06.18 15:48",
        status: "완료",
        reportStep: "4차 보고",
        injured: true,
        directives: { 작업중지: true, 현장통제: true, 신고119: true, 응급조치: true, 현장보존: true },
        timeline: [
          { time: "15:48", event: "사고 발생", desc: "철탑 자재 낙하로 부상", color: "#E53E3E" },
          { time: "15:50", event: "1차 보고 접수", desc: "박성우 작업자 → 최팀장", color: "#E53E3E" },
          { time: "15:52", event: "119 신고 완료", desc: "구급대 현장 이송", color: "#2B6CB0" },
          { time: "16:10", event: "전체 조치 완료", desc: "5개 항목 모두 지시 완료", color: "#276749" },
        ],
      },
    ];

    const STATUS_STYLE = {
      "진행중": { bg: "#FFF5F5", border: "#FED7D7", color: "#C53030", dot: "#E53E3E" },
      "완료":   { bg: "#F0FFF4", border: "#9AE6B4", color: "#276749", dot: "#38A169" },
    };

    const filtered = situationFilter === "전체"
      ? ACCIDENTS
      : ACCIDENTS.filter(a => a.status === situationFilter);

    const activeCount = ACCIDENTS.filter(a => a.status === "진행중").length;
    const doneCount   = ACCIDENTS.filter(a => a.status === "완료").length;

    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>
        <div style={{ ...styles.statusBar, background: "#fff" }}><span>9:41</span><span>📶 🔋</span></div>

        {/* 헤더 */}
        <div style={{
          background: "#1A365D", padding: "14px 20px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>안전 상황실</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>실시간 사고 현황 모니터링</div>
          </div>
          <button onClick={() => go(SCREENS.LOGIN)} style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: 8, padding: "6px 12px", color: "#fff",
            fontSize: 12, cursor: "pointer",
          }}>← 나가기</button>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: "flex", gap: 10, padding: "14px 16px 0" }}>
          {[
            { label: "전체 사고", value: ACCIDENTS.length, bg: "#fff", color: "#111", border: "#E2E8F0" },
            { label: "진행중",   value: activeCount,       bg: "#FFF5F5", color: "#C53030", border: "#FED7D7" },
            { label: "완료",     value: doneCount,         bg: "#F0FFF4", color: "#276749", border: "#9AE6B4" },
          ].map(c => (
            <div key={c.label} style={{
              flex: 1, background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* 필터 탭 */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px 8px" }}>
          {["전체", "진행중", "완료"].map(f => (
            <button key={f} onClick={() => setSituationFilter(f)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: situationFilter === f ? "#1A365D" : "#fff",
              color: situationFilter === f ? "#fff" : "#888",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}>{f}</button>
          ))}
        </div>

        {/* 사고 목록 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>
          {filtered.map(acc => {
            const st = STATUS_STYLE[acc.status];
            const directiveDone = Object.values(acc.directives).filter(Boolean).length;
            return (
              <button
                key={acc.id}
                onClick={() => { setSelectedAccident(acc); go(SCREENS.SITUATION_DETAIL); }}
                style={{
                  width: "100%", background: "#fff", border: `1px solid ${st.border}`,
                  borderRadius: 12, padding: "14px", marginBottom: 10,
                  textAlign: "left", cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {/* 상단: 유형 + 상태 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{acc.icon}</span>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{acc.type}</span>
                      <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>{acc.id}</span>
                    </div>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: st.bg, border: `1px solid ${st.border}`,
                    borderRadius: 16, padding: "3px 10px",
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{acc.status}</span>
                  </div>
                </div>

                {/* 중간: 정보 */}
                <div style={{ fontSize: 12, color: "#555", marginBottom: 8, lineHeight: 1.6 }}>
                  <div>📍 {acc.location}</div>
                  <div>👷 {acc.worker} · {acc.team} · {acc.workType}</div>
                  <div>🕐 {acc.occurredAt}</div>
                </div>

                {/* 하단: 보고 단계 + 조치 진행률 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    background: "#EBF8FF", color: "#2B6CB0",
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                  }}>{acc.reportStep}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 60, height: 4, background: "#E2E8F0", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${(directiveDone / 5) * 100}%`,
                        background: directiveDone === 5 ? "#38A169" : "#E53E3E",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#888" }}>조치 {directiveDone}/5</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 화면 SR-D: 상황실 — 개별 사고 상세 ──────────────
  if (screen === SCREENS.SITUATION_DETAIL && selectedAccident) {
    const acc = selectedAccident;
    const DIRECTIVE_META = [
      { key: "작업중지", icon: "🚫", label: "작업중지 지시",         color: "#C53030" },
      { key: "현장통제", icon: "🚧", label: "현장 통제 (출입 통제)", color: "#B7791F" },
      { key: "신고119",  icon: "🚑", label: "119 신고",              color: "#2B6CB0" },
      { key: "응급조치", icon: "🏥", label: "응급조치 / 병원 이송",  color: "#6B46C1" },
      { key: "현장보존", icon: "🔒", label: "현장 보존 조치",        color: "#276749" },
    ];
    const directiveDone = Object.values(acc.directives).filter(Boolean).length;

    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>
        <div style={{ ...styles.statusBar, background: "#fff" }}><span>9:41</span><span>📶 🔋</span></div>

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
            }}>📊 보고서 출력</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 화면 SMS ────────────────────────────────────────
  if (screen === SCREENS.SMS) {
    return (
      <div style={{ ...styles.phone, background: "#F7F8FC" }}>
        <div style={{ ...styles.statusBar, background: "#fff" }}><span>9:41</span><span>📶 🔋</span></div>
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
          <button style={styles.redBtn} onClick={() => go(SCREENS.MAIN)}>홈으로 이동</button>
        </div>
      </div>
    );
  }

  return null;
}

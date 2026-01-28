import {
  Home, Upload, RefreshCw, X, Info, Database, Wrench, Target,
  BarChart2, Grid, ClipboardList, Sparkles, FileText, Moon, User, Clock,
  ChevronDown, ChevronRight
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Fragment, useContext, useEffect, useRef, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { useCookies } from "react-cookie";
import { LoginApi } from "@/services/login/LoginApi.js";
import { MenuBarApi } from "./MenuBarApi";

const MENU_ITEMS = [
  {
    label: "데이터설정",
    path: "/data_status/setting",
    children: [
      { label: "문항관리", path: "/data_status/setting/variable", icon: Info },
      { label: "전체 데이터(뷰어)", path: "/data_status/setting/viewer", icon: Database },
      { label: "문항 가공", path: "/data_status/setting/recoding", icon: Wrench },
      { label: "가중치 생성", path: "/data_status/setting/weight", icon: Target },
    ]
  },
  {
    label: "집계현황",
    path: "/data_status/aggregation",
    children: [
      { label: "집계현황", path: "/data_status/aggregation/status", icon: BarChart2 },
      { label: "교차 테이블", path: "/data_status/aggregation/cross", icon: Grid },
      { label: "쿼터현황/관리", path: "/data_status/aggregation/quota", icon: ClipboardList },
    ]
  },
  {
    label: "AI요약",
    path: "/data_status/ai",
    children: [
      { label: "AI분석", path: "/data_status/ai/analysis", icon: Sparkles },
      { label: "AI리포트", path: "/data_status/ai/report", icon: FileText },
    ]
  },
];

const MenuBar = () => {
  const { getTest } = MenuBarApi();
  const [, , removeCookie] = useCookies();
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutMutation } = LoginApi();

  // 드롭다운 상태
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  // 메뉴 섹션 토글 상태
  const [openSections, setOpenSections] = useState({
    "데이터설정": true,
    "집계현황": true,
    "AI요약": false
  });

  const toggleSection = (label) => {
    setOpenSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  // 외부 클릭 시 open 닫기
  useEffect(() => {
    const onClickOutside = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);

  const handleApiTest = () => {
    getTest.mutate({}, {
      onSuccess: (res) => {
        console.log("API Test Success:", res);
        alert("API 연결 성공: " + JSON.stringify(res));
      },
      onError: (err) => {
        console.error("API Test Error:", err);
        alert("API 연결 실패");
      }
    });
  };

  // 로그아웃
  const doLogout = async () => {
    modal.showConfirm("알림", "로그아웃하시겠습니까?", {
      btns: [
        { title: "취소", background: "#75849a" },
        {
          title: "로그아웃",
          click: async () => {
            try {
              const res = await logoutMutation.mutateAsync({ user: auth?.user?.userId, gb: "out" });
              if (res?.success === "777") {
                await persistor.purge();
                removeCookie("TOKEN", { path: "/" });
                sessionStorage.setItem("projectnum", "");
                sessionStorage.setItem("projectname", "");
                sessionStorage.setItem("servername", "");
                sessionStorage.setItem("projectpof", "");
                navigate("/login");
              } else {
                modal.showAlert("알림", "로그아웃을 하지 못했습니다.");
              }
            } catch {
              modal.showAlert("알림", "로그아웃을 하지 못했습니다.");
            }
          },
        },
      ],
    });
  };

  return (
    <aside style={{
      width: "250px",
      height: "100%",
      background: "#fff",
      borderRight: "1px solid #d3d7d5", // Original border color
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      zIndex: 100,
      padding: "24px 0"
    }} data-theme="data-dashboard">
      {/* Header Section - Restoring Original Look */}
      <div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="home-btn"
            onClick={() => {
              sessionStorage.setItem("projectnum", "");
              sessionStorage.setItem("projectname", "");
              sessionStorage.setItem("servername", "");
              sessionStorage.setItem("projectpof", "");
              navigate("/");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              fontSize: "15px",
              fontWeight: 600,
              color: "#555",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
              e.currentTarget.style.color = "#333";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#555";
            }}
          >
            <Home size={18} />
            <span>홈</span>
          </button>
          <div style={{ width: "1px", height: "14px", background: "#dcdcdc" }}></div>
          <h1
            className="logo"
            style={{ cursor: "pointer", fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", letterSpacing: "-0.5px", whiteSpace: "nowrap" }}
            onClick={() => navigate("/data_status")}
          >
            <span className="ai-logo-text" style={{ fontSize: "20px" }}>SRT</span>
            <span style={{ fontSize: "18px" }}>데이터 현황</span>
          </h1>
        </div>
      </div>

      {/* Project Name Display */}
      <div style={{ padding: "0 20px 12px 20px" }}>
        <div
          onClick={handleApiTest}
          style={{
            cursor: "pointer",
            padding: "7px",
            // background: "var(--primary-bg-light)",
            borderRadius: "8px",
            border: "1px solid var(--primary-border-light)",
            color: "var(--primary-dark)",
            fontWeight: "700",
            fontSize: "15px",
            textAlign: "center",
            wordBreak: "break-all",
            lineHeight: "1.4"
          }}>
          API 연결 테스트 (임시)
        </div>
      </div>

      <div style={{ padding: "0 20px 12px 20px" }}>
        <div style={{
          padding: "12px",
          background: "var(--primary-bg-light)",
          borderRadius: "8px",
          border: "1px solid var(--primary-border-light)",
          color: "var(--primary-dark)",
          fontWeight: "700",
          fontSize: "15px",
          textAlign: "center",
          wordBreak: "break-all",
          lineHeight: "1.4"
        }}>
          {sessionStorage.getItem("projectname") || "조사명 없음"}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ padding: "0 20px 20px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          type="button"
          onClick={() => modal.showAlert("알림", "데이터 신규등록 기능은 준비 중입니다.")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            background: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            color: "#333",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f9"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
        >
          <Upload size={16} />
          <span>데이터 신규등록</span>
        </button>
        <button
          type="button"
          onClick={() => modal.showAlert("알림", "데이터 새로고침 기능은 준비 중입니다.")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            background: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            color: "#333",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f9"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
        >
          <RefreshCw size={16} />
          <span>데이터 새로고침</span>
        </button>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          fontSize: "11px !important",
          color: "#999",
          marginTop: "6px"
        }}>
          <Clock size={12} />
          <span>마지막: 2026-01-26 14:30:00</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
        {MENU_ITEMS.map((section, idx) => (
          <div key={idx} style={{ marginBottom: "24px" }}>
            <div
              onClick={() => toggleSection(section.label)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                marginBottom: "12px",
                paddingLeft: "8px",
                paddingRight: "8px"
              }}
            >
              <h3 style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#888",
                margin: 0
              }}>
                {section.label}
              </h3>
              {openSections[section.label] ?
                <ChevronDown size={14} color="#888" /> :
                <ChevronRight size={14} color="#888" />
              }
            </div>

            {openSections[section.label] && (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {section.children.map((item, cIdx) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <li key={cIdx} style={{ marginBottom: "4px" }}>
                      <NavLink
                        to={item.path}
                        style={({ isActive }) => ({
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          textDecoration: "none",
                          fontSize: "15px",
                          fontWeight: isActive ? "600" : "500",
                          color: isActive ? "var(--primary-color)" : "#333",
                          background: isActive ? "var(--primary-bg-light)" : "transparent",
                          transition: "all 0.2s"
                        })}
                        onClick={(e) => {
                          if (item.label === "전체 데이터(뷰어)") {
                            e.preventDefault();
                            const width = window.screen.width;
                            const height = window.screen.height;
                            window.open(item.path, "_blank", `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`);
                          } else if (item.label === "AI분석" || item.label === "AI리포트") {
                            e.preventDefault();
                            modal.showAlert("알림", `${item.label} 기능은 준비 중입니다.`);
                          }
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* User / Logout Section */}
      <div style={{
        padding: "20px",
        borderTop: "1px solid #eee",
        marginTop: "auto",
        position: "relative" // For absolute positioning of dropdown
      }} ref={userRef}>
        <button
          type="button"
          onClick={() => setUserOpen(!userOpen)}
          style={{
            width: "100%",
            background: "#f5f5f5", // Neutral light gray
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#e5e5e5"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#f5f5f5"}
        >
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px", border: "1px solid #e0e0e0", color: "#555" }}>
            <User size={16} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#333", flex: 1, textAlign: "left" }}>
            {auth?.user?.userNm || "사용자"}님
          </span>
        </button>

        {userOpen && (
          <div style={{
            position: "absolute",
            bottom: "100%", // Open upwards
            left: "20px",
            right: "20px",
            marginBottom: "10px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "8px",
            border: "1px solid #eee",
            zIndex: 1000
          }}>
            <button
              type="button"
              onClick={doLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "none",
                background: "var(--primary-bg-light)", // Theme light bg
                color: "var(--primary-color)", // Theme color
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-bg-medium)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--primary-bg-light)"}
            >
              {/* Using a simple logout icon if not imported, or reuse existing icon logic */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default MenuBar;

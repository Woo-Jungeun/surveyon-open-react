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
import "./MenuBar.css";
import NewDataModal from "./NewDataModal";

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

  const [isNewDataModalOpen, setIsNewDataModalOpen] = useState(false);

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
    <aside className="menu-bar" data-theme="data-dashboard">
      {/* Header Section */}
      <div className="menu-bar-header">
        <div className="menu-bar-header-content">
          <button
            type="button"
            className="menu-bar-home-btn"
            onClick={() => {
              sessionStorage.setItem("projectnum", "");
              sessionStorage.setItem("projectname", "");
              sessionStorage.setItem("servername", "");
              sessionStorage.setItem("projectpof", "");
              navigate("/");
            }}
          >
            <Home size={18} />
            <span>홈</span>
          </button>
          <div className="menu-bar-divider"></div>
          <h1
            className="menu-bar-logo"
            onClick={() => navigate("/data_status")}
          >
            <span className="ai-logo-text">SRT</span>
            <span>데이터 현황</span>
          </h1>
        </div>
      </div>

      {/* Project Name Display */}
      <div className="menu-bar-project">
        <div className="menu-bar-project-name">
          {sessionStorage.getItem("projectname") || "조사명 없음"}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="menu-bar-actions">
        <button
          type="button"
          className="menu-bar-action-btn"
          onClick={() => setIsNewDataModalOpen(true)}
        >
          <Upload size={16} />
          <span>데이터 신규등록</span>
        </button>
        <button
          type="button"
          className="menu-bar-action-btn"
          onClick={() => modal.showAlert("알림", "데이터 새로고침 기능은 준비 중입니다.")}
        >
          <RefreshCw size={16} />
          <span>데이터 새로고침</span>
        </button>
        <div className="menu-bar-last-update">
          <Clock size={12} />
          <span>마지막: 2026-01-26 14:30:00</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="menu-bar-nav">
        {MENU_ITEMS.map((section, idx) => (
          <div key={idx} className="menu-bar-section">
            <div
              className="menu-bar-section-header"
              onClick={() => toggleSection(section.label)}
            >
              <h3 className="menu-bar-section-title">
                {section.label}
              </h3>
              {openSections[section.label] ?
                <ChevronDown size={14} color="#888" /> :
                <ChevronRight size={14} color="#888" />
              }
            </div>

            {openSections[section.label] && (
              <ul className="menu-bar-section-list">
                {section.children.map((item, cIdx) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <li key={cIdx} className="menu-bar-section-item">
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `menu-bar-nav-link ${isActive ? 'active' : ''}`
                        }
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
      <div className="menu-bar-user" ref={userRef}>
        <button
          type="button"
          className="menu-bar-user-btn"
          onClick={() => setUserOpen(!userOpen)}
        >
          <div className="menu-bar-user-avatar">
            <User size={16} />
          </div>
          <span className="menu-bar-user-name">
            {auth?.user?.userNm || "사용자"}님
          </span>
        </button>

        {userOpen && (
          <div className="menu-bar-user-dropdown">
            <button
              type="button"
              className="menu-bar-logout-btn"
              onClick={doLogout}
            >
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

      {isNewDataModalOpen && (
        <NewDataModal
          onClose={() => setIsNewDataModalOpen(false)}
          onConfirm={(data) => {
            console.log("New Data:", data);
            setIsNewDataModalOpen(false);
            // modal.showAlert("알림", "데이터가 등록되었습니다.");
          }}
        />
      )}
    </aside>
  );
};

export default MenuBar;

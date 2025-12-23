import { Home } from "lucide-react";
import manualCss from '@/assets/css/manual.css?inline';
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Fragment, useContext, useEffect, useRef, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { useCookies } from "react-cookie";
import { manualData } from "./ManualData";

/**
 * 프로젝트 목록 클릭 시 → 탭: ["/ai_open_analysis"]
 * 문항 목록 이동 시 → 탭: ["/ai_open_analysis", "/ai_open_analysis/pro_list"]
 * 분석 이동 시 → 탭: ["/ai_open_analysis", "/ai_open_analysis/pro_list", "/ai_open_analysis/option_setting"]
 */
const ROUTE_LABEL = {
  "/ai_open_analysis": "프로젝트 목록",
  "/ai_open_analysis/pro_list": "문항 목록",
  "/ai_open_analysis/option_setting": "분석",
};

const normalize = (p) => {
  if (!p || p === "/") return "/";
  return p.split("?")[0];  // 전체 path 유지
};

// 현재 경로에 맞는 탭 트레일 계산
const trailFor = (key) => {
  if (key === "/ai_open_analysis/option_setting") return ["/ai_open_analysis", "/ai_open_analysis/pro_list", "/ai_open_analysis/option_setting"];
  if (key === "/ai_open_analysis/pro_list") return ["/ai_open_analysis", "/ai_open_analysis/pro_list"];
  if (key === "/ai_open_analysis/pro_permission") return ["/ai_open_analysis", "/ai_open_analysis/pro_list"];
  if (key === "/ai_open_analysis/pro_register") return ["/ai_open_analysis", "/ai_open_analysis/pro_list"];
  return ["/ai_open_analysis"];
};

const MenuBar = () => {
  const [, , removeCookie] = useCookies();
  const auth = useSelector((store) => store.auth);
  const userAuth = auth?.user?.userAuth || "";
  const userGroup = auth?.user?.userGroup || "";
  const roleSource = userAuth || userGroup; //권한 없으면 그룹으로 체크 
  const manage = ["고객", "일반"].some(role => roleSource.includes(role));

  const modal = useContext(modalContext);
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = useMemo(() => normalize(location.pathname), [location.pathname]);
  const tabs = useMemo(() => trailFor(activePath), [activePath]);

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  // 드롭다운 상태
  const [appsOpen, setAppsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // 외부 클릭 닫기용 ref
  const appsRef = useRef(null);
  const userRef = useRef(null);

  // 외부 클릭 시 open 닫기
  useEffect(() => {
    const onClickOutside = (e) => {
      if (appsRef.current && !appsRef.current.contains(e.target)) setAppsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);

  // 로그아웃
  const doLogout = async () => {
    modal.showConfirm("알림", "로그아웃하시겠습니까?", {
      btns: [
        { title: "취소", background: "#75849a" },
        {
          title: "로그아웃",
          click: async () => {
            try {
              await persistor.purge();
              removeCookie("TOKEN", { path: "/" });
              sessionStorage.setItem("projectnum", "");
              sessionStorage.setItem("projectname", "");
              sessionStorage.setItem("servername", "");
              sessionStorage.setItem("projectpof", "");
              navigate("/login"); // 로그아웃 시 홈으로
            } catch {
              modal.showAlert("알림", "로그아웃을 하지 못하였습니다.");
            }
          },
        },
      ],
    });
  };

  // 앱스(점9개) 아이콘 (SVG) -todo 임시
  const AppsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      {[0, 1, 2].map(r => [0, 1, 2].map(c => (
        <circle key={`${r}-${c}`} cx={5 + c * 7} cy={5 + r * 7} r="1.5" />
      )))}
    </svg>
  );

  // 유저(사람) 아이콘 (SVG)
  const UserIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  // 권한 관리 아이콘 (SVG)
  const UserSettingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );

  // API 설정 아이콘 (SVG)
  const ApiSettingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
    </svg>
  );

  // 매뉴얼 아이콘 (물음표)
  const ManualIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );

  // 로그아웃 아이콘 (SVG)
  const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );



  // 매뉴얼 새창 열기
  // 
  const openManual = () => {
    window.open("/manual", "manual", "width=1280,height=900,scrollbars=yes");
  };
  return (
    <Fragment>
      <header key={location.pathname}>
        <div className="logoWrap" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              padding: "8px 10px",
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

          <div style={{ width: "1px", height: "14px", background: "#dcdcdc", margin: "0 2px" }}></div>

          <h1
            className="logo"
            style={{ cursor: "pointer", fontSize: "22px", fontWeight: "700", display: "flex", alignItems: "center", letterSpacing: "-0.5px" }}
            onClick={() => {
              navigate("/ai_open_analysis");
            }}
          >
            <span className="ai-logo-text">AI</span>오픈분석
          </h1>
        </div>

        <div className="navWrap">
          <ul className="nav depth01">
            {tabs.map((path) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={activePath === path ? "on" : undefined}
                  onClick={() => {
                    // 프로젝트 목록 클릭 시 세션 초기화
                    if (path === "/") {
                      sessionStorage.setItem("projectnum", "");
                      sessionStorage.setItem("projectname", "");
                      sessionStorage.setItem("servername", "");
                      sessionStorage.setItem("projectpof", "");
                    }
                  }}
                >
                  {ROUTE_LABEL[path] ?? path}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="userWrap" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* 고객/일반 권한은 앱 메뉴 숨김 */}
          {(!roleSource.includes("고객") && !roleSource.includes("일반")) && (
            <div ref={appsRef} className="menu-dd">
              <button
                type="button"
                className="iconBtn"
                aria-haspopup="true"
                aria-expanded={appsOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setAppsOpen((v) => !v);
                  setUserOpen(false);
                }}
              >
                <AppsIcon />
              </button>

              {appsOpen && (
                <div className="dropdown-card apps-card">
                  {activePath !== "/ai_open_analysis" && (
                    <>
                      {/* 권한 관리: 일반, 고객만 안보이게(임시) */}
                      {!manage && (
                        <button
                          type="button"
                          className="dd-item"
                          onClick={() => {
                            setAppsOpen(false);
                            navigate('/ai_open_analysis/pro_permission');
                          }}
                        >
                          <span className="dd-icon"><UserSettingIcon /></span>
                          <span>권한 관리</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* API 설정:  일반, 고객만 안보이게 */}
                  {/* {!manage && (
                    <button
                      type="button"
                      className="dd-item"
                      onClick={() => {
                        setAppsOpen(false);
                        navigate('/ai_open_analysis/pro_key');
                      }}
                    >
                      <span className="dd-icon"><ApiSettingIcon /></span>
                      <span>API 설정</span>
                    </button>
                  )} */}

                  {/* 매뉴얼 */}
                  <button
                    type="button"
                    className="dd-item"
                    onClick={() => {
                      setAppsOpen(false);
                      openManual();
                    }}
                  >
                    <span className="dd-icon"><ManualIcon /></span>
                    <span>매뉴얼</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 사용자 이름 - 로그아웃 메뉴 */}
          <div ref={userRef} className="menu-dd">
            <button
              type="button"
              className="userBtn"
              aria-haspopup="true"
              aria-expanded={userOpen}
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen((v) => !v);
                setAppsOpen(false);
              }}
            >
              <UserIcon />
              <span style={{ marginLeft: 6 }}>{auth?.user?.userNm || ""}님</span>
            </button>

            {userOpen && (
              <div className="dropdown-card user-card">
                <button type="button" className="dd-item only" onClick={doLogout}>
                  <span className="dd-icon"><LogoutIcon /></span>
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </Fragment >
  );
};

export default MenuBar;

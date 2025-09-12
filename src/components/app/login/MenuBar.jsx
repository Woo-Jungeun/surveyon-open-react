import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { useCookies } from "react-cookie";

/**
 * 프로젝트 목록 클릭 시 → 탭: ["/"]
 * 문항 목록 이동 시 → 탭: ["/", "/pro_list"]
 * 분석 이동 시 → 탭: ["/", "/pro_list", "/open-setting"]
*/
const ROUTE_LABEL = {
  "/": "프로젝트 목록",
  "/pro_list": "문항 목록",
  "/open-setting": "분석",
};

// 현재 경로를 1뎁스로 정규화
const normalize = (p) => {
  if (!p || p === "/") return "/";
  const seg = p.split("?")[0].split("/").filter(Boolean);
  return "/" + (seg[0] || "");
};

// 현재 경로에 맞는 탭 트레일 계산
const trailFor = (key) => {
  if (key === "/open-setting") return ["/", "/pro_list", "/open-setting"];
  if (key === "/pro_list") return ["/", "/pro_list"];
  return ["/"];
};

const MenuBar = () => {
  const [, , removeCookie] = useCookies();
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate();
  const location = useLocation();

  const key = normalize(location.pathname);
  const tabs = trailFor(key);

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
              navigate("/"); // 로그아웃 시 홈으로
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

  // 유저(사람) 아이콘 -todo 임시
  const UserIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5.5V21h18v-1.5C21 16.5 17 14 12 14Z" />
    </svg>
  );

  return (
    <Fragment>
      <header>
        <h1
          className="logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          설문온 <span className="fcG">OPEN</span>
        </h1>

        <div className="navWrap">
          <ul className="nav depth01">
            {tabs.map((path) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === "/"}                  
                  className={({ isActive }) => (isActive ? "on" : undefined)}
                >
                  {ROUTE_LABEL[path] ?? path}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="userWrap" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* 점 아홉개 - 앱 메뉴 */}
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
              // title="앱 메뉴"
            >
              <AppsIcon />
            </button>

            {appsOpen && (
              <div className="dropdown-card apps-card">
                <button
                  type="button"
                  className="dd-item"
                  onClick={() => {
                    setAppsOpen(false);
                    // TODO: 실제 경로/팝업으로 교체
                    // navigate('/project/new');
                    modal.showAlert("알림", "프로젝트등록 준비 중");
                  }}
                >
                  <span className="dd-icon">＋</span>
                  <span>프로젝트등록</span>
                </button>

                <button
                  type="button"
                  className="dd-item"
                  onClick={() => {
                    setAppsOpen(false);
                    // navigate('/api-setting');
                    modal.showAlert("알림", "API설정 준비 중");
                  }}
                >
                  <span className="dd-icon">🔑</span>
                  <span>API설정</span>
                </button>
              </div>
            )}
          </div>

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
              // title="사용자 메뉴"
            >
              <UserIcon />
              <span style={{ marginLeft: 6 }}>{auth?.user?.userNm || ""}님</span>
            </button>

            {userOpen && (
              <div className="dropdown-card user-card">
                <button type="button" className="dd-item only" onClick={doLogout}>
                  <span className="dd-icon">↪</span>
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </Fragment>
  );
};

export default MenuBar;

import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
export default function MenuBar({ userName = "", links = {} }) {
  
  // /o2 접두사를 항상 ‘붙여주는’ 헬퍼 (절대 지우지 않음)
  const addBase = (p) => {
    if (!p) return "/o2/";             // 기본은 /o2/
    if (p === "/o2") return "/o2/";    // /o2 -> /o2/
    if (p.startsWith("/o2/")) return p;
    if (p.startsWith("/")) return "/o2" + p;  // /projects -> /o2/projects
    return "/o2/" + p.replace(/^\/?/, "");    // projects -> /o2/projects
  };

  // 기본 라우트
  const defaults = {
    analysis: "/o2/",
    projects: "/o2/projects",
    questions: "/o2/questions",
    createProject: "/o2/projects/new",
    addQuestion: "/o2/questions/new",
    userSettings: "/o2/admin/users",
    apiSettings: "/o2/settings/api",
  };

  // 외부에서 넘어온 links도 /o2 접두 보장해서 병합
  const raw = { ...defaults, ...links };
  const L = {
    analysis: addBase(raw.analysis),
    projects: addBase(raw.projects),
    questions: addBase(raw.questions),
    createProject: addBase(raw.createProject),
    addQuestion: addBase(raw.addQuestion),
    userSettings: addBase(raw.userSettings),
    apiSettings: addBase(raw.apiSettings),
    // 서버 사이드 이동은 그대로
    logout: links.logout || "/pro_login?session_logout=logout",
  };

  const [openGrid, setOpenGrid] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const gridRef = useRef(null);
  const userRef = useRef(null);

  const TABS = [
    { label: "프로젝트 목록", to: L.projects },
    { label: "문항 목록", to: L.questions },
    { label: "분석", to: L.analysis }, // "/o2/"
  ];

  useEffect(() => {
    const onDocClick = (e) => {
      if (gridRef.current && !gridRef.current.contains(e.target)) setOpenGrid(false);
      if (userRef.current && !userRef.current.contains(e.target)) setOpenUser(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpenGrid(false); setOpenUser(false); }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="smopen-header" role="banner">
      <div className="smh-bar">
        <div className="smh-box">
          {/* 좌측: 로고 + 1depth */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="smh-brand">
              <NavLink to={L.analysis} end>설문온-OPEN</NavLink>
            </div>

            <nav className="smh-nav" aria-label="Primary">
              <ul className="smh-nav-list">
                {TABS.map((tab) => (
                  <li key={tab.to}>
                    <div className="li_txt">
                      <NavLink
                        to={tab.to}
                        end={tab.to === "/o2/"}              // 루트만 end로 정확 매칭
                        className={({ isActive }) => (isActive ? "on" : undefined)}
                      >
                        {tab.label}
                      </NavLink>
                    </div>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* 우측: 9점 메뉴 + 유저 */}
          <div className="smh-util">
            <div className="smh-grid-wrap" ref={gridRef}>
              <button
                type="button"
                className="smh-grid-btn"
                aria-haspopup="true"
                aria-expanded={openGrid}
                aria-label="빠른 작업 메뉴"
                onClick={(e) => { e.stopPropagation(); setOpenGrid(v => !v); setOpenUser(false); }}
              >
                <span /><span /><span />
                <span /><span /><span />
                <span /><span /><span />
              </button>

              <div className={`smh-dd ${openGrid ? "show" : ""}`} role="menu">
                <ul className="smh-grid">
                  <li><NavLink to={L.createProject}><span className="smh-ico green">+</span><span>프로젝트등록</span></NavLink></li>
                  <li><NavLink to={L.addQuestion}><span className="smh-ico red">+</span><span>문항추가</span></NavLink></li>
                  <li><NavLink to={L.userSettings}><span className="smh-ico cyan">👥</span><span>사용자설정</span></NavLink></li>
                  <li><NavLink to={L.apiSettings}><span className="smh-ico blue">🔑</span><span>API설정</span></NavLink></li>
                </ul>
              </div>
            </div>

            <div className="smh-user" ref={userRef}>
              <button
                type="button"
                className="smh-user-btn"
                aria-haspopup="true"
                aria-expanded={openUser}
                aria-label="사용자 메뉴"
                onClick={(e) => { e.stopPropagation(); setOpenUser(v => !v); setOpenGrid(false); }}
              >
                <span className="smh-avatar" aria-hidden>
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path fill="currentColor" d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 1.79-7 4v1h14v-1c0-2.21-3.13-4-7-4z" />
                  </svg>
                </span>
                <span className="smh-name">{userName || "-"}</span>
              </button>

              <div className={`smh-dd smh-user-dd ${openUser ? "show" : ""}`} role="menu">
                <a href={L.logout}>로그아웃</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

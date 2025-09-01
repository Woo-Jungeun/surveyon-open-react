import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import "@/assets/css/header.css";

export default function MenuBar({ userName = "", links = {} }) {
    const L = {
        projects: "/projects",
        questions: "/questions",
        analysis: "/",
        createProject: "/projects/new",
        addQuestion: "/questions/new",
        userSettings: "/admin/users",
        apiSettings: "/settings/api",
        logout: "/pro_login?session_logout=logout",
        ...links,
    };

    const [openGrid, setOpenGrid] = useState(false);
    const [openUser, setOpenUser] = useState(false);
    const gridRef = useRef(null);
    const userRef = useRef(null);
    const initial = (userName || "").trim().slice(0, 1).toUpperCase();

    // 탭 정의 (map 사용)
    const TABS = [
        { label: "프로젝트 목록", to: L.projects },
        { label: "문항 목록", to: L.questions },
        { label: "분석", to: L.analysis },
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
        <div className="smopen-header" role="banner">
            <div className="smh-bar">
                <div className="smh-box">
                    {/* 좌측: 로고 + 1depth */}
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div className="smh-brand">
                            <a href={L.analysis}>설문온-OPEN</a>
                        </div>

                        {/* map으로 메뉴 */}
                        <nav className="smh-nav" aria-label="Primary">
                            <ul className="smh-nav-list">
                                {TABS.map((tab) => (
                                    <li key={tab.to}>
                                        <div className="li_txt">
                                            <NavLink
                                                to={tab.to}
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
                        {/* 9점 메뉴 */}
                        <div className="smh-grid-wrap" ref={gridRef}>
                            <button
                                type="button"
                                className="smh-grid-btn"
                                aria-haspopup="true"
                                aria-expanded={openGrid}
                                aria-label="빠른 작업 메뉴"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenGrid((v) => !v);
                                    setOpenUser(false);
                                }}
                            >
                                <span /><span /><span />
                                <span /><span /><span />
                                <span /><span /><span />
                            </button>

                            <div className={`smh-dd ${openGrid ? "show" : ""}`} role="menu">
                                <ul className="smh-grid">
                                    <li>
                                        <a href={L.createProject}>
                                            <span className="smh-ico green">+</span>
                                            <span>프로젝트등록</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a href={L.addQuestion}>
                                            <span className="smh-ico red">+</span>
                                            <span>문항추가</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a href={L.userSettings}>
                                            <span className="smh-ico cyan">👥</span>
                                            <span>사용자설정</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a href={L.apiSettings}>
                                            <span className="smh-ico blue">🔑</span>
                                            <span>API설정</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* 유저 메뉴 */}
                        <div className="smh-user" ref={userRef}>
                            <button
                                type="button"
                                className="smh-user-btn"
                                aria-haspopup="true"
                                aria-expanded={openUser}
                                aria-label="사용자 메뉴"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenUser((v) => !v);
                                    setOpenGrid(false);
                                }}
                            >
                                {/* ▼ 여기: 이니셜 대신 사람 아이콘 */}
                                <span className="smh-avatar" aria-hidden>
                                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                        <path fill="currentColor"
                                            d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 1.79-7 4v1h14v-1c0-2.21-3.13-4-7-4z" />
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
        </div>
    );
}

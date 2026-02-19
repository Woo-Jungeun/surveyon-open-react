import React, { useState, useRef, useEffect, useContext } from "react";
import {
    Home, ChevronRight, ChevronLeft, User, LogOut, Menu, Clock, ChevronDown, Settings
} from "lucide-react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCookies } from "react-cookie";
import { modalContext } from "@/components/common/Modal.jsx";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { LoginApi } from "@/services/login/LoginApi.js";
import "./Sidebar.css";

/**
 * 공통 세로 사이드바 컴포넌트
 *
 * @param {Object} brand - { title, logoText, logoClass, onClick, icon }
 * @param {Array} menuGroups - [{ label, items: [{ label, path, icon, isPending, children }] }]
 * @param {Object} projectInfo - { title, lastUpdated } (상단 프로젝트 정보 표시용)
 * @param {string} theme - "purple" (기본) | "blue" (데이터현황용)
 * @param {Array} moduleItems - 모듈 스위처 메뉴 아이템
 * @param {ReactNode} extraActions - 헤더와 메뉴 사이 추가 컨텐츠
 * @param {ReactNode} bottomActions - 푸터 상단에 추가할 컨텐츠
 */
const Sidebar = ({
    brand,
    menuGroups = [],
    projectInfo,
    theme = "purple",
    moduleItems = [],
    extraActions,
    bottomActions,
    pageInfo
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [, , removeCookie] = useCookies();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const { logoutMutation } = LoginApi();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    // 모듈 리스트 내 '메인 메뉴' 토글 상태 (기본값 true로 펼쳐둠)
    const [moduleListOpen, setModuleListOpen] = useState(true);
    const [openSections, setOpenSections] = useState({});

    const userRef = useRef(null);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 섹션 토글
    const toggleSection = (label) => {
        if (isCollapsed) return;
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // 초기 열려있는 섹션 설정
    useEffect(() => {
        if (menuGroups.length > 0) {
            const initial = {};
            menuGroups.forEach(group => {
                initial[group.label] = group.defaultOpen !== false;
            });
            setOpenSections(initial);
        }
    }, [menuGroups]);

    const handleLogout = async () => {
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
                                sessionStorage.clear();
                                navigate("/login");
                            } else {
                                modal.showAlert("알림", "로그아웃 실패");
                            }
                        } catch (e) {
                            console.error(e);
                            modal.showAlert("알림", "오류가 발생했습니다.");
                        }
                    },
                },
            ],
        });
    };

    const onHomeClick = () => {
        sessionStorage.setItem("projectnum", "");
        sessionStorage.setItem("projectname", "");
        sessionStorage.setItem("servername", "");
        sessionStorage.setItem("projectpof", "");
        sessionStorage.setItem("merge_pn", "");
        sessionStorage.setItem("merge_pn_text", "");
        sessionStorage.setItem("pageId", "");
        sessionStorage.setItem("pagetitle", "");
        navigate("/");
    };

    const onBrandClick = () => {
        if (brand?.onClick) {
            brand.onClick();
        } else {
            onHomeClick();
        }
    };

    return (
        <aside className={`common-sidebar ${theme} ${isCollapsed ? "collapsed" : ""}`} data-theme={theme === "blue" ? "data-dashboard" : ""}>
            {/* Header Area */}
            <div className="sidebar-header">
                <div className="header-top" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    {/* 홈 버튼 */}
                    <button type="button" className="home-btn" title="홈으로" onClick={onHomeClick} style={{ padding: '6px' }}>
                        <Home size={18} />
                    </button>
                    <div className="header-divider"></div>
                    {/* 상단: 브랜드 */}
                    <div className="brand-area" onClick={onBrandClick}>
                        {brand?.icon}
                        <span className={brand?.logoClass || "brand-title"}>
                            {brand?.logoText && <span className="logo-accent">{brand.logoText}</span>}
                            {brand?.title}
                        </span>
                    </div>
                </div>

                {/* Toggle Button */}
                <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Project Info Section */}
            {projectInfo && !isCollapsed && (
                <div className="project-info-box">
                    <div className="sidebar-project-label">현재 조사</div>
                    <div className="project-info-card">
                        <div className="project-title">{projectInfo.title}</div>
                        {projectInfo.subTitle && (
                            <span className="project-id-badge">{projectInfo.subTitle}</span>
                        )}
                        <button
                            className="project-settings-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (projectInfo.onSettingsClick) projectInfo.onSettingsClick();
                            }}
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Page Info Section */}
            {pageInfo && !isCollapsed && (
                <div className="project-info-box">
                    <div className="sidebar-project-label">현재 페이지</div>
                    <div className="project-info-card">
                        <div className="project-title" style={{ fontSize: "13px", fontWeight: 500 }}>{pageInfo.title}</div>
                        <button
                            className="project-settings-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (pageInfo.onSettingsClick) pageInfo.onSettingsClick();
                            }}
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* 1. Main Menu (Fixed) */}
            {moduleItems.length > 0 && (
                <div className="nav-group module-group fixed-menu">
                    <div className="group-header" onClick={() => setModuleListOpen(!moduleListOpen)}>
                        <span className="group-title">메인 메뉴</span>
                        {!isCollapsed && (
                            <ChevronDown
                                size={14}
                                className={`group-arrow ${moduleListOpen ? 'open' : ''}`}
                            />
                        )}
                    </div>

                    {(isCollapsed || moduleListOpen) && (
                        <ul className="group-list">
                            {moduleItems.map((m, i) => (
                                <li key={i} className="nav-item">
                                    <div
                                        className={`nav-link main-nav-link ${m.highlight || m.module === theme.replace('blue', 'data_status') ? 'active' : ''} ${m.isDisabled ? 'disabled' : ''}`}
                                        onClick={() => {
                                            if (m.isDisabled) return;
                                            if (m.onClick) {
                                                m.onClick();
                                            } else {
                                                navigate(m.path, { state: m.state });
                                            }
                                        }}
                                    >
                                        {m.icon && React.cloneElement(m.icon, { size: 18, strokeWidth: 2, className: "nav-icon" })}
                                        <span>{m.label}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Navigation Menu (Scrollable) */}
            <nav className="sidebar-nav">
                {/* Extra Actions (데이터 신규등록 등) - Scrollable */}
                {extraActions && <div className="extra-actions-wrapper">{extraActions}</div>}

                {/* 2. Sub Menus (Current Page Menus) */}
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="nav-group">
                        {group.label && (
                            <div className="group-header" onClick={() => toggleSection(group.label)}>
                                <span className="group-title">{group.label}</span>
                                {!isCollapsed && (
                                    <ChevronDown
                                        size={14}
                                        className={`group-arrow ${openSections[group.label] ? 'open' : ''}`}
                                    />
                                )}
                            </div>
                        )}

                        {(isCollapsed || openSections[group.label]) && (
                            <ul className="group-list">
                                {group.items.map((item, i) => {
                                    const Icon = item.icon;

                                    if (!item.path) {
                                        return (
                                            <li key={i} className="nav-item">
                                                <div
                                                    className={`nav-link ${item.isPending ? "pending" : ""}`}
                                                    onClick={(e) => {
                                                        if (item.isPending) {
                                                            e.preventDefault();
                                                            modal.showAlert("알림", "서비스 준비 중입니다.");
                                                            return;
                                                        }
                                                        if (item.onClick) {
                                                            item.onClick(e);
                                                        }
                                                    }}
                                                >
                                                    {Icon && <Icon className="nav-icon" size={18} strokeWidth={2} />}
                                                    <span>{item.label}</span>
                                                </div>
                                            </li>
                                        );
                                    }

                                    return (
                                        <li key={i} className="nav-item">
                                            <NavLink
                                                to={item.path}
                                                end={item.end}
                                                className={({ isActive }) => {
                                                    const finalActive = item.isActive ? item.isActive(location.pathname) : isActive;
                                                    return `nav-link ${finalActive ? "active" : ""} ${item.isPending ? "pending" : ""}`;
                                                }}
                                                onClick={(e) => {
                                                    if (item.isPending) {
                                                        e.preventDefault();
                                                        modal.showAlert("알림", "서비스 준비 중입니다.");
                                                    }
                                                    if (item.onClick) {
                                                        item.onClick(e);
                                                    }
                                                }}
                                            >
                                                {Icon && <Icon className="nav-icon" size={18} strokeWidth={2} />}
                                                <span>{item.label}</span>
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ))}
                {bottomActions && (
                    <div className="sidebar-bottom-scroll-actions" style={{ marginTop: '16px' }}>
                        {bottomActions}
                    </div>
                )}
            </nav>

            {/* Footer / User Area */}
            <div className="sidebar-footer" ref={userRef}>
                <div className="user-wrap">
                    {userOpen && (
                        <div className="user-dropdown">
                            <button className="logout-btn" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>로그아웃</span>
                            </button>
                        </div>
                    )}

                    <div className="user-card" onClick={() => setUserOpen(!userOpen)}>
                        <div className="user-avatar">
                            <User size={16} />
                        </div>
                        {!isCollapsed && (
                            <div className="user-info">
                                <span className="user-name">{auth?.user?.userNm || "사용자"}님</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

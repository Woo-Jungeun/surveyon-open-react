import React, { useState, useRef, useEffect, useContext } from "react";
import {
    Home, ChevronRight, ChevronLeft, User, LogOut, Menu, Clock, ChevronDown
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
 */
const Sidebar = ({
    brand,
    menuGroups = [],
    projectInfo,
    theme = "purple",
    moduleItems = [],
    extraActions
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [, , removeCookie] = useCookies();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const { logoutMutation } = LoginApi();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [moduleOpen, setModuleOpen] = useState(false);
    const [openSections, setOpenSections] = useState({});

    const userRef = useRef(null);
    const moduleRef = useRef(null);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
            if (moduleRef.current && !moduleRef.current.contains(e.target)) setModuleOpen(false);
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
                <div className="header-top">
                    <button type="button" className="home-btn" title="홈으로" onClick={onHomeClick}>
                        <Home size={18} />
                        <span>홈</span>
                    </button>
                    <div className="header-divider"></div>

                    {moduleItems.length > 0 ? (
                        <React.Fragment>
                            <div ref={moduleRef} style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    className={`module-toggle-btn ${moduleOpen ? 'active' : ''}`}
                                    onClick={() => setModuleOpen(!moduleOpen)}
                                >
                                    <Menu size={18} />
                                </button>
                                {moduleOpen && (
                                    <div className="module-dropdown">
                                        {moduleItems.map((m, i) => (
                                            <button
                                                key={i}
                                                className={`module-item ${m.highlight ? 'highlight' : ''} ${m.isDisabled ? 'disabled' : ''}`}
                                                onClick={() => {
                                                    if (m.isDisabled) return;
                                                    if (m.onClick) {
                                                        m.onClick();
                                                    } else {
                                                        navigate(m.path, { state: m.state });
                                                    }
                                                    setModuleOpen(false);
                                                }}
                                            >
                                                {m.icon}
                                                <span>{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {!isCollapsed && (
                                <div className="brand-area" onClick={onBrandClick} style={{ marginLeft: '8px' }}>
                                    <span className={brand?.logoClass || "brand-title"}>
                                        {brand?.logoText && <span className="logo-accent">{brand.logoText}</span>}
                                        {brand?.title}
                                    </span>
                                </div>
                            )}
                        </React.Fragment>
                    ) : (
                        <div className="brand-area" onClick={onBrandClick}>
                            {brand?.icon}
                            <span className={brand?.logoClass || "brand-title"}>
                                {brand?.logoText && <span className="logo-accent">{brand.logoText}</span>}
                                {brand?.title}
                            </span>
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Project Info Section */}
            {projectInfo && !isCollapsed && (
                <div className="project-info-box">
                    <div className="project-title">{projectInfo.title}</div>
                    {projectInfo.lastUpdated && (
                        <div className="project-update">
                            <Clock size={12} />
                            <span>최근 업데이트: {projectInfo.lastUpdated}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Extra Actions */}
            {extraActions && <div className="extra-actions">{extraActions}</div>}

            {/* Navigation Menu */}
            <nav className="sidebar-nav">
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="nav-group">
                        {group.label && (
                            <div className="group-header" onClick={() => toggleSection(group.label)}>
                                <span className="group-title">{group.label}</span>
                                {!isCollapsed && group.items.some(it => it.children) && (
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
                                    return (
                                        <li key={i} className="nav-item">
                                            <NavLink
                                                to={item.path}
                                                end={item.end}
                                                className={({ isActive }) => `nav-link ${isActive ? "active" : ""} ${item.isPending ? "pending" : ""}`}
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

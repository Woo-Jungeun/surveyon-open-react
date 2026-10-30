import React, { useState, useRef, useEffect, useContext } from "react";
import {
    Home, ChevronRight, ChevronLeft, User, LogOut, Menu, Clock, ChevronDown, Settings, ShieldCheck, BookOpen, Lock, Check
} from "lucide-react";
import { useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCookies } from "react-cookie";
import { modalContext } from "@/components/common/Modal.jsx";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { LoginApi } from "@/services/login/LoginApi.js";
import ProPermissionModal from "./ProPermissionModal.jsx";
import "./Sidebar.css";

/**
 * 공통 세로 사이드바 컴포넌트
 *
 * @param {Object} brand - { title, logoText, logoClass, onClick, icon }
 * @param {Array} menuGroups - [{ label, items: [{ label, path, icon, isPending, children }] }]
 * @param {Object} projectInfo - { title, lastUpdated } (상단 프로젝트 정보 표시용)
 * @param {string} theme - "purple" (기본) | "blue" (H-SRT용)
 * @param {Array} moduleItems - 모듈 스위처 메뉴 아이템
 * @param {ReactNode} extraActions - 헤더와 메뉴 사이 추가 컨텐츠
 * @param {ReactNode} bottomActions - 푸터 상단에 추가할 컨텐츠
 */
const Sidebar = ({
    id = "app-sidebar",
    brand,
    menuGroups = [],
    projectInfo,
    theme = "purple",
    moduleItems = [],
    extraActions,
    bottomActions,
    pageInfo,
    ...rest
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [, , removeCookie] = useCookies();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const { logoutMutation } = LoginApi();

    const handleGoPermission = () => {
        const projectnum = sessionStorage.getItem("projectnum");
        setUserOpen(false);
        if (projectnum) {
            setPermissionOpen(true);
        } else {
            navigate("/project", { state: { from: 'ai_open', redirect: 'pro_permission' } });
        }
    };

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [hasMergePn, setHasMergePn] = useState(false);
    const [permissionOpen, setPermissionOpen] = useState(false);
    // 모듈 리스트 내 '메인 메뉴' 토글 상태 (기본값 true로 펼쳐둠)
    const [moduleListOpen, setModuleListOpen] = useState(false); // 드롭다운용으로 사용
    const [openSections, setOpenSections] = useState({});
    const [openSubmenus, setOpenSubmenus] = useState({});
    const [selectedDpView, setSelectedDpView] = useState(() => {
        return new URLSearchParams(location.search).get("dp_view") || "table";
    });

    useEffect(() => {
        const view = new URLSearchParams(location.search).get("dp_view") || "table";
        setSelectedDpView(view);
    }, [location.search]);

    useEffect(() => {
        const handleStepEvent = (e) => {
            const stepKey = e.detail?.targetKey || e.detail?.stepKey;
            if (stepKey) {
                setSelectedDpView(stepKey);
            }
        };
        window.addEventListener("dpChangeStepRequest", handleStepEvent);
        window.addEventListener("dpStepChanged", handleStepEvent);
        return () => {
            window.removeEventListener("dpChangeStepRequest", handleStepEvent);
            window.removeEventListener("dpStepChanged", handleStepEvent);
        };
    }, []);

    const userRef = useRef(null);
    const moduleMenuRef = useRef(null); // 모듈 메뉴 외부 클릭 감지용

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
            if (moduleMenuRef.current && !moduleMenuRef.current.contains(e.target)) setModuleListOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 메뉴(라우터) 이동 시 즉각적인 버전 확인 및 강제 새로고침
    useEffect(() => {
        const checkVersionAndReload = async () => {
            // 이미 토스트가 떠 있는 상태에서 메뉴를 이동했다면 묻지도 따지지도 않고 새로고침
            if (document.getElementById('version-update-toast')) {
                window.location.reload();
                return;
            }
            try {
                let currentScriptUrl = null;
                document.querySelectorAll('script').forEach(s => {
                    if (s.src && s.src.includes('/assets/index-')) currentScriptUrl = s.src;
                });
                if (!currentScriptUrl) return;
                
                const res = await fetch('/index.html?_t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } });
                const text = await res.text();
                const match = text.match(/<script[^>]+src="([^"]+index-[^"]+\.js)"/);
                if (match) {
                    const newScriptUrl = match[1];
                    if (currentScriptUrl.split('/').pop() !== newScriptUrl.split('/').pop()) {
                        window.location.reload(); // 메뉴 이동 시에는 토스트 띄우지 않고 바로 새로고침
                    }
                }
            } catch (e) {}
        };
        checkVersionAndReload();
    }, [location.pathname]);

    // 섹션 토글
    const toggleSection = (label) => {
        if (isCollapsed) return;
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // 초기 열려있는 섹션 및 하위 메뉴 설정
    useEffect(() => {
        if (menuGroups.length > 0) {
            const initial = {};
            const initialSub = {};
            menuGroups.forEach(group => {
                initial[group.label] = group.defaultOpen !== false;
                group.items?.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        const itemBasePath = item.path ? item.path.split('?')[0] : "";
                        const isCurrentPath = (itemBasePath && location.pathname.startsWith(itemBasePath)) ||
                            item.children.some(child => child.path && location.pathname.startsWith(child.path.split('?')[0]));
                        initialSub[item.label] = Boolean(item.defaultOpen || isCurrentPath);
                    }
                });
            });
            setOpenSections(prev => ({ ...initial, ...prev }));
            setOpenSubmenus(prev => {
                const nextSub = { ...initialSub, ...prev };
                Object.keys(initialSub).forEach(key => {
                    if (initialSub[key]) nextSub[key] = true;
                });
                return nextSub;
            });
        }
    }, [menuGroups]);

    // 하위 메뉴가 있는 아이템 경로에 진입 시 하위 메뉴 자동 열림
    useEffect(() => {
        menuGroups.forEach(group => {
            group.items?.forEach(item => {
                if (item.children && item.children.length > 0) {
                    const itemBasePath = item.path ? item.path.split('?')[0] : "";
                    const isCurrentPath = (itemBasePath && location.pathname.startsWith(itemBasePath)) ||
                        item.children.some(child => child.path && location.pathname.startsWith(child.path.split('?')[0]));
                    if (isCurrentPath) {
                        setOpenSubmenus(prev => ({ ...prev, [item.label]: true }));
                    }
                }
            });
        });
    }, [location.pathname, location.search, menuGroups]);

    const handleLogout = async () => {
        modal.showConfirm("알림", "로그아웃하시겠습니까?", {
            btns: [
                { title: "취소", background: "#75849a" },
                {
                    title: "로그아웃",
                    click: async () => {
                        try {
                            const res = await logoutMutation.mutateAsync({ user: auth?.user?.userId, gb: "out" });
                            if (String(res?.success) === '777') {
                                const isCustomer = sessionStorage.getItem("groupcode") === "999999991";
                                await persistor.purge();
                                removeCookie("TOKEN", { path: "/" });
                                sessionStorage.clear();
                                localStorage.removeItem("hsrtCustomerState");
                                navigate(isCustomer ? "/cs" : "/login");
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
        // sessionStorage.setItem("projectnum", "");
        // sessionStorage.setItem("projectname", "");
        // sessionStorage.setItem("servername", "");
        // sessionStorage.setItem("projectpof", "");
        // sessionStorage.setItem("merge_pn", "");
        // sessionStorage.setItem("merge_pn_text", "");
        // sessionStorage.setItem("pageId", "");
        // sessionStorage.setItem("pagetitle", "");
        navigate("/");
    };

    const onBrandClick = () => {
        if (brand?.onClick) {
            brand.onClick();
        } else {
            onHomeClick();
        }
    };

    const isHsrtCustomer = sessionStorage.getItem("groupcode") === "999999991";

    return (
        <>
            <aside id={id} className={`common-sidebar ${theme} theme-${theme} ${isCollapsed ? "collapsed" : ""}`} data-theme={theme === "blue" ? "data-dashboard" : theme} {...rest}>
                {/* Header Area */}
                <div id="app-sidebar-header" className="sidebar-header">
                    <div className="header-top" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                        {!isHsrtCustomer && (
                            <>
                                {/* 홈 버튼 */}
                                <button type="button" className="home-btn" title="홈으로" onClick={onHomeClick} style={{ padding: '6px' }}>
                                    <Home size={18} />
                                </button>

                                <div className="header-divider" style={{ margin: '0 2px' }}></div>

                                {/* 모듈 메뉴 (드롭다운) */}
                                <div className="module-menu-wrapper" ref={moduleMenuRef}>
                                    <button
                                        type="button"
                                        className={`module-menu-btn ${moduleListOpen ? 'active' : ''}`}
                                        onClick={() => setModuleListOpen(!moduleListOpen)}
                                        title="메인 메뉴"
                                    >
                                        <Menu size={20} />
                                    </button>

                                    {moduleListOpen && (
                                        <div className={`module-dropdown ${isCollapsed ? 'collapsed' : ''}`}>
                                            <ul className="module-dropdown-list">
                                                {moduleItems
                                                    .filter(m => m.label !== "프로젝트 목록")
                                                    .map((m, i) => (
                                                        <li key={i} className="module-dropdown-item">
                                                            <div
                                                                className={`module-link ${m.highlight || m.module === theme.replace('blue', 'data_status') ? 'active' : ''} ${m.isDisabled ? 'disabled' : ''}`}
                                                                onClick={() => {
                                                                    if (m.isDisabled) return;
                                                                    setModuleListOpen(false);
                                                                    if (m.onClick) {
                                                                        m.onClick();
                                                                    } else {
                                                                        navigate(m.path, { state: m.state });
                                                                    }
                                                                }}
                                                            >
                                                                {m.icon && React.cloneElement(m.icon, { size: 18, strokeWidth: 2, className: "module-icon" })}
                                                                <span>{m.label}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="header-divider"></div>
                            </>
                        )}
                        {/* 상단: 브랜드 */}
                        <div
                            className="brand-area"
                            onClick={onBrandClick}
                            style={isHsrtCustomer ? { flex: 1, justifyContent: "center", marginLeft: 0 } : {}}
                        >
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
                        <div
                            className={`project-info-card ${isHsrtCustomer ? "customer-mode" : ""}`}
                            onClick={() => {
                                if (projectInfo.onSettingsClick) projectInfo.onSettingsClick();
                            }}
                        >
                            <div className="project-title" title={projectInfo.title}>{projectInfo.title}</div>
                            {projectInfo.subTitle && (
                                <span className="project-id-badge">{projectInfo.subTitle}</span>
                            )}
                            {!isHsrtCustomer && (
                                <button className="project-settings-btn">
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Page Info Section */}
                {pageInfo && !isCollapsed && (
                    <div className="project-info-box">
                        <div
                            className={`project-info-card ${isHsrtCustomer ? "customer-mode" : ""}`}
                            onClick={() => {
                                if (pageInfo.onSettingsClick) pageInfo.onSettingsClick();
                                else if (pageInfo.onClick) pageInfo.onClick();
                            }}
                        >
                            <div className="project-title" style={{ fontSize: "13px", fontWeight: 500 }} title={pageInfo.title}>{pageInfo.title}</div>
                            {!isHsrtCustomer && (
                                <button className="project-settings-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    if (pageInfo.onSettingsClick) pageInfo.onSettingsClick();
                                    else if (pageInfo.onClick) pageInfo.onClick();
                                }}>
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation Menu (Scrollable) */}
                <nav id="app-sidebar-nav" className="sidebar-nav">
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
                                        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                                        const itemBasePath = item.path ? item.path.split('?')[0] : "";
                                        const isCurrentInItem = Boolean(
                                            (itemBasePath && location.pathname.startsWith(itemBasePath)) ||
                                            item.children?.some(child => child.path && location.pathname.startsWith(child.path.split('?')[0]))
                                        );
                                        const isSubOpen = openSubmenus[item.label] !== undefined ? Boolean(openSubmenus[item.label]) : isCurrentInItem;

                                        if (!item.path) {
                                            return (
                                                <li key={i} className={`nav-item ${hasChildren ? "has-children" : ""}`}>
                                                    <div
                                                        className={`nav-link ${item.isPending ? "pending" : ""}`}
                                                        title={isCollapsed ? item.label : undefined}
                                                        onClick={(e) => {
                                                            if (item.isPending) {
                                                                e.preventDefault();
                                                                modal.showAlert("알림", "서비스 준비 중입니다.");
                                                                return;
                                                            }
                                                            if (hasChildren && !isCollapsed) {
                                                                setOpenSubmenus(prev => ({ ...prev, [item.label]: !isSubOpen }));
                                                            }
                                                            if (item.onClick) {
                                                                item.onClick(e);
                                                            }
                                                        }}
                                                    >
                                                        {Icon && <Icon className="nav-icon" size={18} strokeWidth={2} />}
                                                        <span>{item.label}</span>
                                                        {hasChildren && !isCollapsed && (
                                                            <span
                                                                className={`submenu-toggle-btn ${isSubOpen ? "open" : ""}`}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setOpenSubmenus(prev => ({ ...prev, [item.label]: !isSubOpen }));
                                                                }}
                                                                title={isSubOpen ? "하위 메뉴 접기" : "하위 메뉴 펼치기"}
                                                            >
                                                                <ChevronDown size={14} className="submenu-arrow" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    {hasChildren && !isCollapsed && isSubOpen && (
                                                        <ul className="sub-group-list">
                                                            {item.children.map((child, cIdx) => {
                                                                const currentDpView = selectedDpView || new URLSearchParams(location.search).get("dp_view") || "table";
                                                                const isDpRequestPage = location.pathname.startsWith("/data_status/hsrt/dp_request");
                                                                const isChildActive = child.view
                                                                    ? (isDpRequestPage && currentDpView === child.view)
                                                                    : (child.isActive
                                                                        ? child.isActive(location.pathname, location)
                                                                        : (itemBasePath ? location.pathname.startsWith(itemBasePath) : true) && `${location.pathname}${location.search}` === child.path
                                                                    );

                                                                return (
                                                                    <li key={cIdx} className="sub-nav-item">
                                                                        <Link
                                                                            to={child.path}
                                                                            className={`sub-nav-link ${isChildActive ? "active" : ""} ${child.disabled ? "disabled" : ""}`}
                                                                            title={child.description || (child.disabled ? child.disabledMessage : child.label)}
                                                                            onClick={(e) => {
                                                                                setOpenSubmenus(prev => ({ ...prev, [item.label]: true }));
                                                                                if (child.disabled) {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    modal.showAlert("알림", child.disabledMessage || "이용할 수 없는 메뉴입니다.");
                                                                                    return;
                                                                                }
                                                                                if (child.onClick) {
                                                                                    child.onClick(e);
                                                                                    if (e.defaultPrevented) return;
                                                                                }
                                                                                if (location.pathname === "/data_status/hsrt/dp_request" && child.view) {
                                                                                    e.preventDefault();
                                                                                    window.dispatchEvent(new CustomEvent("dpChangeStepRequest", { detail: { targetKey: child.view } }));
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className="sub-nav-left">
                                                                                <span className="sub-nav-step-badge">{child.stepNum || cIdx + 1}</span>
                                                                                <span className="sub-nav-title">{child.label}</span>
                                                                            </div>
                                                                            <div
                                                                                className="sub-nav-right"
                                                                                title={child.disabled ? (child.disabledMessage || "스터브 저장 완료 후 요약표를 설정할 수 있습니다.") : undefined}
                                                                            >
                                                                                {child.disabled && (
                                                                                    <span
                                                                                        className="sub-nav-lock-wrapper"
                                                                                        title={child.disabledMessage || "스터브 저장 완료 후 요약표를 설정할 수 있습니다."}
                                                                                        style={{ display: "inline-flex", alignItems: "center" }}
                                                                                    >
                                                                                        <Lock size={12} className="sub-nav-lock-icon" />
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </Link>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </li>
                                            );
                                        }

                                        return (
                                            <li key={i} className={`nav-item ${hasChildren ? "has-children" : ""}`}>
                                                <NavLink
                                                    to={item.path}
                                                    end={item.end}
                                                    title={isCollapsed ? item.label : undefined}
                                                    className={({ isActive }) => {
                                                        const finalActive = item.isActive ? item.isActive(location.pathname, location) : isActive;
                                                        return `nav-link ${finalActive ? "active" : ""} ${item.isPending ? "pending" : ""}`;
                                                    }}
                                                    onClick={(e) => {
                                                        if (item.isPending) {
                                                            e.preventDefault();
                                                            modal.showAlert("알림", "서비스 준비 중입니다.");
                                                            return;
                                                        }
                                                        if (hasChildren && !isCollapsed) {
                                                            setOpenSubmenus(prev => ({ ...prev, [item.label]: true }));
                                                        }
                                                        if (location.pathname === "/data_status/hsrt/dp_request" && item.path.startsWith("/data_status/hsrt/dp_request")) {
                                                            e.preventDefault();
                                                            const query = item.path.includes("?") ? item.path.split("?")[1] : "";
                                                            const targetKey = new URLSearchParams(query).get("dp_view") || "table";
                                                            window.dispatchEvent(new CustomEvent("dpChangeStepRequest", { detail: { targetKey } }));
                                                        }
                                                        if (item.onClick) {
                                                            item.onClick(e);
                                                        }
                                                    }}
                                                >
                                                    {Icon && <Icon className="nav-icon" size={18} strokeWidth={2} />}
                                                    <span>{item.label}</span>
                                                    {hasChildren && !isCollapsed && (
                                                        <span
                                                            className={`submenu-toggle-btn ${isSubOpen ? "open" : ""}`}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setOpenSubmenus(prev => ({ ...prev, [item.label]: !isSubOpen }));
                                                            }}
                                                            title={isSubOpen ? "하위 메뉴 접기" : "하위 메뉴 펼치기"}
                                                        >
                                                            <ChevronDown size={14} className="submenu-arrow" />
                                                        </span>
                                                    )}
                                                </NavLink>

                                                {hasChildren && !isCollapsed && isSubOpen && (
                                                    <ul className="sub-group-list">
                                                        {item.children.map((child, cIdx) => {
                                                            const currentDpView = selectedDpView || new URLSearchParams(location.search).get("dp_view") || "table";
                                                            const isDpRequestPage = location.pathname.startsWith("/data_status/hsrt/dp_request");
                                                            const isChildActive = child.view
                                                                ? (isDpRequestPage && currentDpView === child.view)
                                                                : (child.isActive
                                                                    ? child.isActive(location.pathname, location)
                                                                    : (itemBasePath ? location.pathname.startsWith(itemBasePath) : true) && `${location.pathname}${location.search}` === child.path
                                                                );

                                                            return (
                                                                <li key={cIdx} className="sub-nav-item">
                                                                    <Link
                                                                        to={child.path}
                                                                        className={`sub-nav-link ${isChildActive ? "active" : ""} ${child.disabled ? "disabled" : ""}`}
                                                                        title={child.description || (child.disabled ? child.disabledMessage : child.label)}
                                                                        onClick={(e) => {
                                                                            setOpenSubmenus(prev => ({ ...prev, [item.label]: true }));
                                                                            if (child.disabled) {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                modal.showAlert("알림", child.disabledMessage || "이용할 수 없는 메뉴입니다.");
                                                                                return;
                                                                            }
                                                                            if (child.onClick) {
                                                                                child.onClick(e);
                                                                                if (e.defaultPrevented) return;
                                                                            }
                                                                            if (location.pathname === "/data_status/hsrt/dp_request" && child.view) {
                                                                                e.preventDefault();
                                                                                window.dispatchEvent(new CustomEvent("dpChangeStepRequest", { detail: { targetKey: child.view } }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div className="sub-nav-left">
                                                                            <span className="sub-nav-step-badge">{child.stepNum || cIdx + 1}</span>
                                                                            <span className="sub-nav-title">{child.label}</span>
                                                                        </div>
                                                                        <div
                                                                            className="sub-nav-right"
                                                                            title={child.disabled ? (child.disabledMessage || "스터브 저장 완료 후 요약표를 설정할 수 있습니다.") : undefined}
                                                                        >
                                                                            {child.disabled && (
                                                                                <span
                                                                                    className="sub-nav-lock-wrapper"
                                                                                    title={child.disabledMessage || "스터브 저장 완료 후 요약표를 설정할 수 있습니다."}
                                                                                    style={{ display: "inline-flex", alignItems: "center" }}
                                                                                >
                                                                                    <Lock size={12} className="sub-nav-lock-icon" />
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </Link>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
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
                <div id="app-sidebar-footer" className="sidebar-footer" ref={userRef}>
                    <div className="user-wrap">
                        {userOpen && (
                            <div className="user-dropdown">
                                {!isHsrtCustomer && (
                                    <button className="permission-btn" onClick={() => window.open("/manual", "manual", "width=1280,height=900,scrollbars=yes")}>
                                        <BookOpen size={16} />
                                        <span>매뉴얼</span>
                                    </button>
                                )}
                                {!isHsrtCustomer && hasMergePn && (
                                    <button className="permission-btn" onClick={handleGoPermission}>
                                        <ShieldCheck size={16} />
                                        <span>권한 관리</span>
                                    </button>
                                )}
                                <button className="logout-btn" onClick={handleLogout}>
                                    <LogOut size={16} />
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        )}

                        <div className="user-card" onClick={() => {
                            const pn = sessionStorage.getItem("merge_pn");
                            setHasMergePn(!!(pn && pn.trim() !== ""));
                            setUserOpen(!userOpen);
                        }}>
                            <div className="user-avatar">
                                <User size={16} />
                            </div>
                            {!isCollapsed && (
                                <div className="user-info">
                                    <span className="user-name">
                                        {isHsrtCustomer ? "H-SRT고객" : `${auth?.user?.userNm || "사용자"}님`}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
            <ProPermissionModal open={permissionOpen} onClose={() => setPermissionOpen(false)} />
        </>
    );
};

export default Sidebar;

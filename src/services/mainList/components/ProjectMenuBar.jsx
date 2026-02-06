import React, { useState, useRef, useEffect, useContext } from "react";
import { List, Home, LogOut, ChevronRight, User, ChevronLeft, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCookies } from "react-cookie";
import { modalContext } from "@/components/common/Modal.jsx";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { LoginApi } from "@/services/login/LoginApi.js";
import "./ProjectMenuBar.css";

const ProjectMenuBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [cookies, , removeCookie] = useCookies();
    const auth = useSelector((store) => store.auth);
    const userGroup = auth?.user?.userGroup || "";
    const modal = useContext(modalContext);
    const { logoutMutation } = LoginApi();

    const from = location.state?.from || 'ai_open';

    const [userOpen, setUserOpen] = useState(false);
    const userRef = useRef(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userRef.current && !userRef.current.contains(event.target)) {
                setUserOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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

    const isActive = (path) => location.pathname === path || (path !== "/project" && location.pathname.startsWith(path));

    return (
        <aside className={`project-sidebar ${isCollapsed ? "collapsed" : ""}`}>
            {/* Header / Logo */}
            <div className="project-sidebar-header" style={{ position: 'relative' }}>
                <div className="project-header-content">
                    <button
                        type="button"
                        className="project-home-btn"
                        onClick={() => navigate("/")}
                    >
                        <Home size={18} strokeWidth={2} />
                        <span>홈</span>
                    </button>
                    <div className="project-header-divider"></div>
                    <div className="project-header-title" onClick={() => navigate("/project", { state: { from } })}>
                        <span className="project-title-srt">설문온</span>
                    </div>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        position: 'absolute',
                        top: '0px',
                        right: '-12px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgb(255, 255, 255)',
                        border: '1px solid rgb(221, 221, 221)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 4px',
                        zIndex: 10
                    }}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Content / Menu */}
            <div className="project-sidebar-content">

                <div className="project-menu-group">
                    <span>메뉴</span>
                </div>

                <div
                    className={`project-menu-item ${isActive("/project") && location.pathname === "/project" ? "active" : ""}`}
                    onClick={() => navigate("/project", { state: { from } })}
                >
                    <List className="project-menu-icon" strokeWidth={2} />
                    <span>프로젝트 목록</span>
                </div>

                {(!userGroup.includes("고객") && !userGroup.includes("일반")) && (
                    <div
                        className={`project-menu-item ${isActive("/project/pro_enter") ? "active" : ""}`}
                        onClick={() => navigate("/project/pro_enter", { state: { from } })}
                    >
                        <Plus className="project-menu-icon" strokeWidth={2} />
                        <span>프로젝트 등록</span>
                    </div>
                )}
            </div>

            {/* Footer / User */}
            <div className="project-sidebar-footer" ref={userRef}>
                <div className="project-user-wrap">
                    {userOpen && (
                        <div className="project-user-dropdown-menu">
                            <button className="project-dd-btn" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>로그아웃</span>
                            </button>
                        </div>
                    )}

                    <div className="project-user-card" onClick={() => setUserOpen(!userOpen)}>
                        <div className="project-user-avatar">
                            <User size={16} />
                        </div>
                        <div className="project-user-name">
                            {auth?.user?.userNm || "사용자"}님
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default ProjectMenuBar;

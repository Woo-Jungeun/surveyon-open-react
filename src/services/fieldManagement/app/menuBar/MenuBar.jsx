import React, { useContext, useEffect, useState } from "react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import { Database, FileText, Grid, ClipboardList, Users, BrainCircuit, Clock, RefreshCw, Trash2 } from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MenuBarApi } from "@/services/dataStatus/app/menuBar/MenuBarApi";
import ProjectSelectionModal from "@/services/dataStatus/app/menuBar/ProjectSelectionModal";
import { VariablePageApi } from "@/services/dataStatus/app/variable/VariablePageApi";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import "@/services/dataStatus/app/menuBar/MenuBar.css";

const MENU_ITEMS = [
    {
        label: "",
        items: [
            { label: "진행현황표", path: "/field_management/analysis/frequency", icon: Grid },
            { label: "쿼터관리", path: "/field_management/analysis/quota", icon: ClipboardList },
            { label: "데이터 삭제(불량)", icon: Trash2, isPending: true },
        ]
    }
];

const MenuBar = ({ projectName, lastUpdated, onOpenProjectModal }) => {
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const auth = useSelector((store) => store.auth);
    const navigate = useNavigate();
    const { getDataInfo, syncMap } = MenuBarApi();
    const { pageList } = VariablePageApi();

    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

    const [pageInfo, setPageInfo] = useState({
        title: projectName || sessionStorage.getItem("projectname") || "조사명 없음",
        processedAt: lastUpdated || "-"
    });

    useEffect(() => {
        const projectnum = sessionStorage.getItem("projectnum");
        const mergePn = sessionStorage.getItem("merge_pn");
        if ((!projectnum || projectnum === "null" || projectnum === "undefined") &&
            (!mergePn || mergePn === "null" || mergePn === "undefined")) {
            setIsProjectModalOpen(true);
        }
    }, []);

    const moduleItems = [
        { label: "설문제작", icon: <FileText size={16} />, path: "/project/pro_list", isDisabled: true },
        { label: "H-SRT", icon: <Grid size={16} />, path: "/data_status/analysis/additional" },
        {
            label: "데이터관리",
            icon: <Database size={16} />,
            path: "/data_management/setting/map",
            onClick: () => { navigate("/data_management/setting/map"); }
        },
        {
            label: "AI오픈분석",
            icon: <BrainCircuit size={16} />,
            path: "/ai_open_analysis",
            onClick: () => {
                navigate("/ai_open_analysis");
            }
        },
        { label: "실사관리", icon: <ClipboardList size={16} />, path: "/field_management/analysis/frequency", highlight: true },
        { label: "응답자관리", icon: <Users size={16} />, path: "/project", isDisabled: true },
    ];

    const projectInfoData = {
        title: pageInfo.title,
        subTitle: sessionStorage.getItem("merge_pn") || sessionStorage.getItem("projectpof") || "ID 미지정",
        onSettingsClick: auth?.user?.userGroup === "H-SRT고객" ? undefined : () => {
            if (onOpenProjectModal) {
                onOpenProjectModal();
            } else {
                setIsProjectModalOpen(true);
            }
        }
    };

    const formatDate = (rawDate) => {
        if (!rawDate) return "-";
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return rawDate;
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()} -${pad(d.getMonth() + 1)} -${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} `;
    };

    const fetchDataInfo = async (pn) => {
        if (sessionStorage.getItem("groupcode") === "999999991") return;
        const userId = auth?.user?.userId;
        if (!userId || !pn) return;
        try {
            const result = await getDataInfo.mutateAsync({ user: userId, pn });
            if (result?.success === "777") {
                setPageInfo(prev => ({
                    ...prev,
                    processedAt: formatDate(result.resultjson.parquetBakedAt)
                }));
            }
        } catch (err) {
            console.warn("fetchDataInfo error", err);
        }
    };

    useEffect(() => {
        const mergePn = sessionStorage.getItem("merge_pn");
        if (mergePn) {
            fetchDataInfo(mergePn);
            const user = auth?.user?.userId;
            if (user) {
                pageList.mutateAsync({ user: user, pn: mergePn })
                    .then(pageRes => {
                        if (pageRes?.success === "777") {
                            const pages = pageRes.resultjson || [];
                            if (pages.length > 0) {
                                const pageId = pages[0].id || pages[0].pageid;
                                sessionStorage.setItem("pageId", pageId);
                            } else {
                                sessionStorage.setItem("pageId", "dummy_page_id_for_field_management");
                            }
                            window.dispatchEvent(new Event("pageSelected"));
                        }
                    })
                    .catch(err => {
                        console.warn("Auto-select page error on mount", err);
                        sessionStorage.setItem("pageId", "dummy_page_id_for_field_management");
                        window.dispatchEvent(new Event("pageSelected"));
                    });
            }
        }
    }, [auth?.user?.userId]);

    const handleRefresh = async () => {
        const userId = auth?.user?.userId;
        const pn = sessionStorage.getItem("merge_pn");
        if (!userId || !pn) return;
        try {
            loadingSpinner.show();
            const result = await syncMap.mutateAsync({ user: userId, pn });
            if (result?.success === "777") {
                modal.showAlert("알림", "데이터 새로고침이 성공적으로 완료되었습니다.");
                await fetchDataInfo(pn);
                window.dispatchEvent(new Event("pageSelected"));
            } else {
                const errorMsg = result?.errortext || result?.errorcontent || result?.message;
                if (errorMsg) modal.showErrorAlert("에러", errorMsg);
            }
        } catch (err) {
            console.error("Refresh error", err);
            modal.showErrorAlert("오류", "데이터 새로고침 중 오류가 발생했습니다.");
        } finally {
            loadingSpinner.hide();
        }
    };

    const ExtraActions = (
        <div className="menu-bar-actions">
            <div className="menu-bar-refresh-bar">
                <div className="menu-bar-info-group">
                    <Clock size={12} strokeWidth={2.5} />
                    <span>{pageInfo.processedAt}</span>
                </div>
                <button className="menu-bar-refresh-btn-minimal" onClick={handleRefresh} title="데이터 새로고침">
                    <RefreshCw size={14} className={syncMap?.isLoading ? "spin" : ""} />
                </button>
            </div>
        </div>
    );

    const handleProjectSelect = async (project) => {
        sessionStorage.setItem("projectnum", project.projectnum || "");
        sessionStorage.setItem("projectname", project.projectname || "");
        sessionStorage.setItem("servername", project.servername || "");
        sessionStorage.setItem("projectpof", project.projectpof || "");
        sessionStorage.setItem("merge_pn", project.merge_pn || "");
        sessionStorage.setItem("merge_pn_text", project.merge_pn_text || "");

        setPageInfo(prev => ({ ...prev, title: project.projectname || "조사명 없음" }));
        setIsProjectModalOpen(false);

        if (project.merge_pn) {
            fetchDataInfo(project.merge_pn);
            try {
                const user = auth?.user?.userId;
                const pageRes = await pageList.mutateAsync({ user: user, pn: project.merge_pn });
                if (pageRes?.success === "777") {
                    const pages = pageRes.resultjson || [];
                    if (pages.length > 0) {
                        const pageId = pages[0].id || pages[0].pageid;
                        sessionStorage.setItem("pageId", pageId);
                    } else {
                        sessionStorage.setItem("pageId", "dummy_page_id_for_field_management");
                    }
                }
            } catch (e) {
                console.warn("Auto-select page error", e);
                sessionStorage.setItem("pageId", "dummy_page_id_for_field_management");
            }
        }

        window.dispatchEvent(new Event("pageSelected"));
    };

    return (
        <>
            <Sidebar
                brand={{
                    title: "실사관리",
                    onClick: () => navigate("/field_management/analysis/frequency")
                }}
                menuGroups={MENU_ITEMS}
                projectInfo={projectInfoData}
                theme="navy"
                moduleItems={moduleItems}
                extraActions={ExtraActions}
            />
            {isProjectModalOpen && (
                <ProjectSelectionModal
                    from="data_status"
                    onSelect={handleProjectSelect}
                    onClose={() => {
                        setIsProjectModalOpen(false);
                        const projectnum = sessionStorage.getItem("projectnum");
                        const mergePn = sessionStorage.getItem("merge_pn");
                        if ((!projectnum || projectnum === "null" || projectnum === "undefined") &&
                            (!mergePn || mergePn === "null" || mergePn === "undefined")) {
                            navigate("/");
                        }
                    }}
                />
            )}
        </>
    );
};

export default MenuBar;

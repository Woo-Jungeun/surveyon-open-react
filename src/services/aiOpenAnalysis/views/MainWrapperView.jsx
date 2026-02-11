import { Fragment, useEffect, useState } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import AiSidebar from "@/services/aiOpenAnalysis/app/AiSidebar.jsx";
import { useSelector } from "react-redux";
import ProjectSelectionModal from "@/services/dataStatus/app/menuBar/ProjectSelectionModal.jsx";
import FooterSection from "@/services/homePage/FooterSection";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const [projectUpdated, setProjectUpdated] = useState(0);
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);

    useEffect(() => {
        const projectnum = sessionStorage.getItem("projectnum");
        if (!projectnum) {
            setProjectModalOpen(true);
        }
    }, [location.pathname, navigate]);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
            {isProjectModalOpen && (
                <ProjectSelectionModal
                    onSelect={(project) => {
                        sessionStorage.setItem("projectnum", project.projectnum || "");
                        sessionStorage.setItem("projectname", project.projectname || "");
                        sessionStorage.setItem("servername", project.servername || "");
                        sessionStorage.setItem("projectpof", project.projectpof || "");
                        sessionStorage.setItem("merge_pn", project.merge_pn || "");
                        sessionStorage.setItem("merge_pn_text", project.merge_pn_text || "");

                        setProjectModalOpen(false);
                        setProjectUpdated((prev) => prev + 1);

                        // 프로젝트 선택 시 해당 프로젝트의 문항 목록으로 이동
                        navigate('/ai_open_analysis/pro_list');
                    }}
                    onClose={() => {
                        setProjectModalOpen(false);

                        const projectnum = sessionStorage.getItem("projectnum");
                        if (!projectnum) {
                            navigate("/");
                        }
                    }}
                />
            )}
            <AiSidebar key={projectUpdated} onOpenProjectModal={() => setProjectModalOpen(true)} />
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Outlet key={projectUpdated} />
                </div>
                <FooterSection style={{ height: '40px', padding: '0 20px' }} />
            </section>
        </div>
    );
};

export default MainWrapperView;

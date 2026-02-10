import { Fragment, useEffect, useState } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import AiSidebar from "@/services/aiOpenAnalysis/app/AiSidebar.jsx";
import { useSelector } from "react-redux";
// import { modalContext } from "@/components/common/Modal.jsx";
import ProjectSelectionModal from "@/services/dataStatus/app/menuBar/ProjectSelectionModal.jsx";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const location = useLocation();
    const navigate = useNavigate();
    // const modal = useContext(modalContext);
    const [projectUpdated, setProjectUpdated] = useState(0);
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);

    useEffect(() => {
        const projectnum = sessionStorage.getItem("projectnum");
        if (!projectnum) {
            setProjectModalOpen(true);
        }
    }, [location.pathname, navigate]);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {isProjectModalOpen && (
                <ProjectSelectionModal
                    onSelect={(project) => {
                        sessionStorage.setItem("projectnum", project.projectnum || "");
                        sessionStorage.setItem("projectname", project.projectname || "");
                        sessionStorage.setItem("servername", project.servername || "");
                        sessionStorage.setItem("projectpof", project.projectpof || "");

                        setProjectModalOpen(false);
                        setProjectUpdated((prev) => prev + 1);

                        // If at root, go to pro_list, else refresh/stay
                        if (location.pathname === '/ai_open_analysis' || location.pathname === '/ai_open_analysis/') {
                            navigate('/ai_open_analysis/pro_list');
                        } else {
                            navigate(0); // Refresh to apply session changes
                        }
                    }}
                    onClose={() => {
                        setProjectModalOpen(false);
                        // Only go home if no project is selected
                        const projectnum = sessionStorage.getItem("projectnum");
                        if (!projectnum) {
                            navigate("/"); // Go home if no project selected
                        }
                        // Otherwise just close the modal
                    }}
                />
            )}
            <AiSidebar key={projectUpdated} onOpenProjectModal={() => setProjectModalOpen(true)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#fff' }}>
                <section style={{ flex: 1, padding: '0' }}>
                    <Outlet key={projectUpdated} />
                </section>
                <footer style={{
                    width: '100%',
                    background: '#ffffff',
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    marginTop: 'auto'
                }}>
                    <div style={{
                        maxWidth: '1280px',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#777'
                    }}>
                        <p style={{ margin: 0 }}>© 2026 설문온 SurveyOn. All rights reserved.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <span style={{
                                width: '9px',
                                height: '9px',
                                background: '#22c55e',
                                borderRadius: '50%'
                            }}></span>
                            시스템 정상 운영중
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default MainWrapperView;

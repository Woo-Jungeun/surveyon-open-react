import { Fragment, useEffect, useState } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";

import MenuBar from "@/services/dataStatus/app/menuBar/MenuBar.jsx";
import FooterSection from "@/services/homePage/FooterSection";
import ProjectSelectionModal from "@/services/dataStatus/app/menuBar/ProjectSelectionModal.jsx";
import { useSelector } from "react-redux";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const [authMenuList, setAuthMenuList] = useState([]);
    const [menuData, setMenuData] = useState();
    const [projectUpdated, setProjectUpdated] = useState(0);
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);

    const index = menuData?.findIndex(i => i.menuUrl === location.pathname || location.pathname === "/" || location.pathname === "/business-plan/course2/time-table/detail");

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

                        setProjectModalOpen(false);
                        setProjectUpdated((prev) => prev + 1);

                        // Refresh to apply session changes
                        navigate(0);
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
            <MenuBar userName={auth?.user?.userName ?? ""} onOpenProjectModal={() => setProjectModalOpen(true)} />
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

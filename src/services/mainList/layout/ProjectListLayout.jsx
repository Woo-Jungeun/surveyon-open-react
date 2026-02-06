import React, { Fragment, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ProjectMenuBar from "../components/ProjectMenuBar";
import "@/services/dataStatus/components/DataHeader.css";
import "@/services/dataStatus/app/DataStatusTheme.css";
import { Home } from "lucide-react";
import FooterSection from "@/services/homePage/FooterSection";

import "./ProjectListLayout.css";

const ProjectListLayout = () => {
    useEffect(() => {
        document.body.classList.add("purple-theme-context");
        return () => {
            document.body.classList.remove("purple-theme-context");
        };
    }, []);

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            {/* Left Sidebar */}
            <ProjectMenuBar />

            {/* Main Content Wrapper */}
            <div className="project-list-page" data-theme="data-dashboard">
                <Outlet />
                <FooterSection style={{ height: '40px', padding: '0 20px' }} />
            </div>
        </div>
    );
};

export default ProjectListLayout;

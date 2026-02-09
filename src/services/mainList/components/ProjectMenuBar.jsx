import React from "react";
import { List, Plus } from "lucide-react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

const ProjectMenuBar = () => {
    const navigate = useNavigate();
    const auth = useSelector((store) => store.auth);
    const userGroup = auth?.user?.userGroup || "";
    const location = useLocation();
    const from = location.state?.from || 'ai_open';

    const menuGroups = [
        {
            label: "메뉴",
            items: [
                {
                    label: "프로젝트 목록",
                    path: "/project",
                    icon: List,
                    end: true,
                    onClick: (e) => {
                        e.preventDefault();
                        sessionStorage.setItem("projectnum", "");
                        sessionStorage.setItem("projectname", "");
                        sessionStorage.setItem("servername", "");
                        sessionStorage.setItem("projectpof", "");
                        navigate("/project", { state: { from } });
                    }
                },
                ...(!userGroup.includes("고객") && !userGroup.includes("일반")
                    ? [{
                        label: "프로젝트 등록",
                        path: "/project/pro_enter",
                        icon: Plus,
                        onClick: (e) => {
                            e.preventDefault();
                            navigate("/project/pro_enter", { state: { from } });
                        }
                    }]
                    : [])
            ]
        }
    ];

    const handleBrandClick = () => {
        sessionStorage.setItem("projectnum", "");
        sessionStorage.setItem("projectname", "");
        sessionStorage.setItem("servername", "");
        sessionStorage.setItem("projectpof", "");
        navigate("/project", { state: { from } });
    };

    return (
        <Sidebar
            brand={{ title: "설문온", logoClass: "project-title-srt", onClick: handleBrandClick }}
            menuGroups={menuGroups}
            theme="purple"
        />
    );
};

export default ProjectMenuBar;

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  BarChart3,
  Database,
  BrainCircuit,
  Users
} from "lucide-react";

const menuItems = [
  {
    id: "survey-creation",
    title: "설문제작",
    description: "직관적인 인터페이스로 다양한 유형의 설문을 손쉽게 제작할 수 있습니다.",
    icon: FileText,
    status: "예정"
  },
  {
    id: "data-dashboard",
    title: "데이터현황",
    description: "문항집계, 교차분석, AI보고서를 통해 데이터를 분석합니다.",
    icon: BarChart3,
    status: "개발중"
  },
  {
    id: "data-management",
    title: "데이터관리",
    description: "응답 데이터를 효율적으로 관리하고 필터링/정제 작업을 수행합니다.",
    icon: Database,
    status: "예정"
  },
  {
    id: "ai-open-analysis",
    title: "AI오픈분석",
    description: "개방형 응답에 대한 AI 기반 심층 분석으로 인사이트를 발굴합니다.",
    icon: BrainCircuit,
    status: "정식오픈"
  },
  {
    id: "respondent-management",
    title: "응답자관리",
    description: "응답자 정보를 체계적으로 관리하고 응답 현황을 확인합니다.",
    icon: Users,
    status: "예정"
  }
];

const MenuSection = () => {
  const navigate = useNavigate();

  return (
    <section className="hp-menu">
      <div className="hp-menu-title-wrap">
        <h2 className="hp-menu-title">통합 플랫폼 기능</h2>
        <p className="hp-menu-desc">
          설문온의 5가지 핵심 기능을 확인해보세요
        </p>
      </div>

      <div className="hp-menu-grid">
        {menuItems.map((item, idx) => (
          <motion.div
            key={item.id}
            className="hp-menu-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigate(`/${item.id}`)}
          >
            <div className="hp-card-icon-wrap">
              <item.icon className="hp-menu-icon" />
            </div>

            <h3 className="hp-menu-card-title">{item.title}</h3>
            <p className="hp-menu-card-desc">{item.description}</p>

            <button className="hp-menu-start-btn">시작하기 →</button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default MenuSection;

import React from "react";
import FooterSection from "@/services/homePage/FooterSection";

/**
 * 설문온 공통 하단 푸터 컴포넌트 (3번 영역)
 *
 * @param {string} [className=""] - 추가 커스텀 클래스
 * @param {React.CSSProperties} [style] - 인라인 스타일 (기본값: height 40px, padding 0 20px)
 */
const PageFooter = ({ className = "", style = {} }) => {
    return (
        <FooterSection
            style={{
                height: '40px',
                padding: '0 20px',
                flexShrink: 0,
                ...style
            }}
        />
    );
};

export default PageFooter;

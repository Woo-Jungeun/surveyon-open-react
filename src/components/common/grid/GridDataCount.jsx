import React from 'react';
import './GridDataCount.css';

/**
 * KendoGrid 데이터 개수 표출 컴포넌트
 * 
 * @param {number} total - 전체 데이터 개수
 * @param {string} label - 표시할 라벨 (기본값: "전체")
 * @param {string} unit - 단위 (기본값: "건")
 * @param {string} className - 추가 CSS 클래스
 * 
 * @example
 * <GridDataCount total={150} />
 * <GridDataCount total={150} label="총" unit="개" />
 */
const GridDataCount = ({ total = 0, label = "전체", unit = "건", className = "" }) => {
    return (
        <div className={`grid-data-count ${className}`}>
            <span className="grid-data-count__label">{label}</span>
            <span className="grid-data-count__number">{total.toLocaleString()}</span>
            <span className="grid-data-count__unit">{unit}</span>
        </div>
    );
};

export default GridDataCount;

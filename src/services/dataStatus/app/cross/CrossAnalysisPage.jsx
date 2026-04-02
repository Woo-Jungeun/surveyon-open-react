import React, { useState } from 'react';
import { Download, Save, Search, Settings, Table as TableIcon } from 'lucide-react';
import DataHeader from '../../components/DataHeader';
import CrossOptionModal from './CrossOptionModal';
import './CrossAnalysisPage.css';

const CrossAnalysisPage = () => {
    const [optionModalOpen, setOptionModalOpen] = useState(false);

    return (
        <div className="cross-analysis-page" data-theme="data-dashboard">
            {/* Header Section */}
            <DataHeader title="문항">
                <button className="data-header-btn" onClick={() => setOptionModalOpen(true)}>
                    <Settings size={16} />
                    <span>옵션 설정</span>
                </button>
            </DataHeader>

            {/* Main Content Section */}
            <div className="cross-analysis-content">
                <div className="cross-analysis-placeholder-card">
                    <TableIcon size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 className="placeholder-title">문항 교차표 메뉴 구성</h3>
                    <p className="placeholder-desc">
                        선택할 문항과 세부 요소를 구성할 영역입니다.<br />
                        (현재 UI 뼈대 및 헤더·풋터 레이아웃을 생성 중입니다)
                    </p>
                </div>
            </div>
            {/* Settings Modal */}
            {optionModalOpen && (
                <CrossOptionModal 
                    onClose={() => setOptionModalOpen(false)} 
                    onApply={(opts) => {
                        console.log('Applied Options:', opts);
                        // Save options
                    }}
                />
            )}
        </div>
    );
};

export default CrossAnalysisPage;

import React, { useState, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Save, RefreshCw, Layers } from 'lucide-react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

const DpRequestDetailStep = () => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                tableOrder: tableOrder,
            };
            console.log("Final saving table order with payload:", payload);
            alert("최종 표 순서 설정이 저장되었습니다. 모든 프로세스가 완료되었습니다.");
        } catch (err) {
            console.error(err);
        } finally {
            loadingSpinner.hide();
        }
    };

    // 산출물 표 리스트 (임시 - 배너 x 문항의 조합)
    const [tableOrder, setTableOrder] = useState([
        { seq: 1, id: 'T001', name: '요약표: 주요 지표 요약', banner: 'Summary', stub: 'KPIs', type: 'Summary' },
        { seq: 2, id: 'T002', name: '표 1: 성별 x 이용 경험', banner: 'B1. 성별', stub: 'Q1', type: 'Cross' },
        { seq: 3, id: 'T003', name: '표 2: 연령 x 이용 경험', banner: 'B2. 연령', stub: 'Q1', type: 'Cross' },
        { seq: 4, id: 'T004', name: '표 3: 거주 지역 x 이용 경험', banner: 'B3. 거주지', stub: 'Q1', type: 'Cross' },
    ]);

    const handleDataChange = (newData) => {
        setTableOrder(newData);
    };

    const handleRefresh = () => {
        loadingSpinner.show();
        setTimeout(() => loadingSpinner.hide(), 500); // 조합 재계산 시뮬레이션
    };

    return (
        <div className="dp-step-container">
            <div className="dp-step-toolbar">
                <div className="dp-toolbar-title">
                    <span className="dp-badge">Step 5</span>
                    <h4>최종 표 순서(Table Order) 설정</h4>
                    <span className="dp-toolbar-desc">결과 보고서 및 엑셀에 출력될 산출물 표의 최종 순서를 확인하고 조정합니다.</span>
                </div>
                <div className="dp-toolbar-actions">
                    <button className="dp-btn-outline" onClick={handleRefresh}>
                        <RefreshCw size={16} />
                        <span>조합 업데이트</span>
                    </button>
                    <button className="dp-primary-btn" onClick={handleSave}>
                        <Save size={16} />
                        <span>최종 저장</span>
                    </button>
                </div>
            </div>

            <div className="dp-grid-wrapper" style={{ flex: 1 }}>
                <KendoGridV2 
                    data={tableOrder}
                    reorderable
                    addable
                    deletable
                    showNo
                    onDataChange={handleDataChange}
                >
                    <Column field="id" title="표 코드" width="100px" editable={false} />
                    <Column field="name" title="표 명칭 (Table Name)" width="400px" />
                    <Column field="banner" title="적용 배너" width="150px" editable={false} />
                    <Column field="stub" title="적용 문항" width="150px" editable={false} />
                    <Column field="type" title="테이블 유형" width="120px" editable={false} />
                </KendoGridV2>
            </div>
        </div>
    );
};

export default DpRequestDetailStep;

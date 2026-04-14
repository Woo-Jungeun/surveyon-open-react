import React, { useState, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Save, ListCheck, Trash2 } from 'lucide-react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

const DpRequestSummaryStep = () => {
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
                summaryItems: summaryItems,
            };
            console.log("Saving summary with payload:", payload);
            alert("요약표 설정이 저장되었습니다.");
        } catch (err) {
            console.error(err);
        } finally {
            loadingSpinner.hide();
        }
    };
    
    // 요약표 문항 데이터 (임시)
    const [summaryItems, setSummaryItems] = useState([
        { id: 'S1', name: '핵심지표 요약 (KPI Summary)', type: 'Summary', target: '전체 문항 대상' },
        { id: 'S2', name: '브랜드 인지도 요약 (Brand Awareness)', type: 'Summary', target: 'Q5, Q6' },
    ]);

    const handleDataChange = (newData) => {
        setSummaryItems(newData);
    };

    return (
        <div className="dp-step-container">
            <div className="dp-step-toolbar">
                <div className="dp-toolbar-title">
                    <span className="dp-badge">Step 4</span>
                    <h4>요약표(Summary) 구성 설정</h4>
                    <span className="dp-toolbar-desc">주요 지표들을 한눈에 볼 수 있는 요약표 구성을 설정합니다.</span>
                </div>
                <div className="dp-toolbar-actions">
                    <button className="dp-btn-outline">
                        <ListCheck size={16} />
                        <span>요약표 문항 선택</span>
                    </button>
                    <button className="dp-primary-btn" onClick={handleSave}>
                        <Save size={16} />
                        <span>저장</span>
                    </button>
                </div>
            </div>

            <div className="dp-grid-wrapper" style={{ flex: 1 }}>
                <KendoGridV2 
                    data={summaryItems}
                    reorderable
                    addable
                    deletable
                    showNo
                    onDataChange={handleDataChange}
                >
                    <Column field="id" title="요약 ID" width="100px" />
                    <Column field="name" title="요약표 명칭" width="400px" />
                    <Column field="type" title="유형" width="150px" />
                    <Column field="target" title="대상 문항" width="250px" />
                    <Column 
                        field="active" 
                        title="활성화" 
                        width="80px" 
                        cell={(props) => (
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" defaultChecked />
                            </td>
                        )} 
                    />
                </KendoGridV2>
            </div>
        </div>
    );
};

export default DpRequestSummaryStep;

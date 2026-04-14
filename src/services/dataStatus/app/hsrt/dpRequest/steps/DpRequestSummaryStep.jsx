import React, { useState, useContext, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Save, ListCheck, Trash2, Search, Filter, Info, Plus } from 'lucide-react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

const DpRequestSummaryStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const [searchTerm, setSearchTerm] = useState('');

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        }
    }));

    // --- 상태 관리 ---
    const [summaryItems, setSummaryItems] = useState([
        { id: 'S1', name: '핵심지표 요약 (KPI Summary)', type: 'Summary', target: '전체 문항 대상', active: true },
        { id: 'S2', name: '브랜드 인지도 요약 (Brand Awareness)', type: 'Summary', target: 'Q5, Q6', active: true },
        { id: 'S3', name: '이용 만족도 요약 (Satisfaction Score)', type: 'Summary', target: 'Q10-Q15', active: false },
    ]);

    // 필터링
    const filteredItems = useMemo(() => {
        if (!searchTerm) return summaryItems;
        return summaryItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.target.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [summaryItems, searchTerm]);

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return false;

        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                summaryItems: summaryItems,
            };
            console.log("Saving summary with payload:", payload);
            
            modal.showAlert('알림', '요약표 설정이 저장되었습니다.');
            if (onUnsavedChange) onUnsavedChange(false);
            return true;
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '저장 중 오류가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleDataChange = (newData) => {
        setSummaryItems(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    return (
        <div className="dp-request-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 상단 통합 제어 바 */}
            <div className="dp-setting-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="dp-step-badge">Step 4</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>요약표(Summary) 구성 설정</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>보고서 상단에 위치할 핵심 요약 지표 정보를 구성합니다.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="dp-search-input-wrapper" style={{ width: '220px' }}>
                            <Search size={14} className="dp-search-input-icon" />
                            <input 
                                type="text" 
                                placeholder="요약표 검색..." 
                                className="dp-search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="dp-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} />
                            <span>요약표 추가</span>
                        </button>
                        <button className="dp-primary-btn" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Save size={16} />
                            <span>최종 저장</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 메인 리스트 카드 */}
            <div className="dp-setting-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="dp-setting-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListCheck size={16} />
                        <span>요약표 구문 목록 ({filteredItems.length})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> 설정된 문항들이 자동으로 집계됩니다</span>
                    </div>
                </div>
                <div className="dp-grid-wrapper" style={{ flex: 1, padding: '12px' }}>
                    <KendoGridV2 
                        data={filteredItems}
                        reorderable
                        addable
                        deletable
                        showNo
                        onDataChange={handleDataChange}
                        style={{ height: '100%' }}
                    >
                        <Column field="id" title="요약 ID" width="100px" editable={false} />
                        <Column field="name" title="요약표 명칭" width="400px" />
                        <Column field="type" title="유형" width="150px" 
                            cell={(props) => (
                                <td style={{ textAlign: 'center' }}>
                                    <span className="dp-badge-mini gray">{props.dataItem.type}</span>
                                </td>
                            )}
                        />
                        <Column field="target" title="대상 문항" width="250px" />
                        <Column 
                            field="active" 
                            title="활성화" 
                            width="100px" 
                            cell={(props) => (
                                <td style={{ textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={props.dataItem.active} 
                                        onChange={(e) => {
                                            const next = summaryItems.map(item => item.id === props.dataItem.id ? { ...item, active: e.target.checked } : item);
                                            handleDataChange(next);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </td>
                            )} 
                        />
                    </KendoGridV2>
                </div>
            </div>
        </div>
    );
});

export default DpRequestSummaryStep;

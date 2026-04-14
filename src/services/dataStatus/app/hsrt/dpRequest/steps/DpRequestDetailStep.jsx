import React, { useState, useContext, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Save, RefreshCw, Layers, Search, Filter, ListOrdered, TableProperties, Info } from 'lucide-react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

const DpRequestDetailStep = forwardRef(({ onUnsavedChange }, ref) => {
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
    const [tableOrder, setTableOrder] = useState([
        { seq: 1, id: 'T001', name: '요약표: 주요 지표 요약', banner: 'Summary', stub: 'KPIs', type: 'Summary' },
        { seq: 2, id: 'T002', name: '표 1: 성별 x 이용 경험', banner: 'B1. 성별', stub: 'Q1', type: 'Cross' },
        { seq: 3, id: 'T003', name: '표 2: 연령 x 이용 경험', banner: 'B2. 연령', stub: 'Q1', type: 'Cross' },
        { seq: 4, id: 'T004', name: '표 3: 거주 지역 x 이용 경험', banner: 'B3. 거주지', stub: 'Q1', type: 'Cross' },
        { seq: 5, id: 'T005', name: '표 4: 직업 x 브랜드 선호도', banner: 'B4. 직업', stub: 'Q4', type: 'Cross' },
        { seq: 6, id: 'T006', name: '표 5: 소득 x 브랜드 선호도', banner: 'B5. 소득', stub: 'Q4', type: 'Cross' },
    ]);

    // 필터링
    const filteredOrder = useMemo(() => {
        if (!searchTerm) return tableOrder;
        return tableOrder.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.banner.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.stub.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tableOrder, searchTerm]);

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return false;

        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                tableOrder: tableOrder,
            };
            console.log("Final saving table order with payload:", payload);
            
            modal.showAlert('완료', '모든 DP 의뢰 설정이 저장되었습니다.');
            if (onUnsavedChange) onUnsavedChange(false);
            return true;
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '저장 중 문제가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleDataChange = (newData) => {
        setTableOrder(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleRefresh = () => {
        loadingSpinner.show();
        // 시뮬레이션: 배너와 문항의 모든 조합을 다시 계산하여 리스트를 갱신하는 로직
        setTimeout(() => {
            modal.showAlert('알림', '배너와 스터브 설정에 기반하여 표 조합이 최신화되었습니다.');
            loadingSpinner.hide();
        }, 800);
    };

    return (
        <div className="dp-request-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 상단 통합 제어 바 */}
            <div className="dp-setting-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="dp-step-badge">Step 5</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>최종 표 순서(Table Order) 설정</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>결과 보고서 및 엑셀에 출력될 산출물 표의 최종 순서를 조정합니다.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="dp-search-input-wrapper" style={{ width: '220px' }}>
                            <Search size={14} className="dp-search-input-icon" />
                            <input 
                                type="text" 
                                placeholder="표 명칭/ID/배너 검색..." 
                                className="dp-search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="dp-btn-outline" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={16} />
                            <span>조합 업데이트</span>
                        </button>
                        <button className="dp-primary-btn" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Save size={16} />
                            <span>최종 완료 및 저장</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 메인 순서 카드 */}
            <div className="dp-setting-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="dp-setting-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListOrdered size={16} />
                        <span>산출물 표 목록 ({filteredOrder.length})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> 드래그하여 엑셀 시트 순서를 조정하세요</span>
                    </div>
                </div>
                <div className="dp-grid-wrapper" style={{ flex: 1, padding: '12px' }}>
                    <KendoGridV2 
                        data={filteredOrder}
                        reorderable
                        addable
                        deletable
                        showNo
                        onDataChange={handleDataChange}
                        style={{ height: '100%' }}
                    >
                        <Column field="id" title="표 코드" width="100px" editable={false} />
                        <Column field="name" title="표 명칭 (Table Name)" width="400px" />
                        <Column field="type" title="유형" width="120px" editable={false} 
                            cell={(props) => (
                                <td style={{ textAlign: 'center' }}>
                                    <span className={`dp-badge-mini ${props.dataItem.type === 'Summary' ? 'blue' : 'gray'}`}>
                                        {props.dataItem.type}
                                    </span>
                                </td>
                            )}
                        />
                        <Column field="banner" title="적용 배너" width="180px" editable={false} 
                            cell={(props) => (
                                <td style={{ verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <TableProperties size={12} style={{ color: '#94a3b8' }} />
                                        <span>{props.dataItem.banner}</span>
                                    </div>
                                </td>
                            )}
                        />
                        <Column field="stub" title="적용 문항" width="180px" editable={false} />
                    </KendoGridV2>
                </div>
            </div>
        </div>
    );
});

export default DpRequestDetailStep;

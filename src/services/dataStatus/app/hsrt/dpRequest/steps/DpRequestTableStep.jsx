import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Save, Plus, Search, Trash2, ChevronDown, List, Settings, Filter } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

const DpRequestTableStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { getBannerDetail } = DpRequestPageApi();

    const [searchTerm, setSearchTerm] = useState('');

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        }
    }));

    // --- 상태 관리 ---
    const [stubs, setStubs] = useState([
        { id: 'q1', name: 'Q1. 귀하의 성별은 무엇입니까?', type: 'Single', base: '전체', show: true },
        { id: 'q2', name: 'Q2. 귀하의 연령은 어떻게 되십니까?', type: 'Single', base: '전체', show: true },
        { id: 'q3', name: 'Q3. 귀하의 거주 지역은 어디입니까?', type: 'Single', base: '전체', show: true },
        { id: 'q4', name: 'Q4. 귀하의 직업은 무엇입니까?', type: 'Single', base: '전체', show: true },
        { id: 'q5', name: 'Q5. 한 달 평균 소득은 어느 정도입니까?', type: 'Single', base: '전체', show: true },
    ]);

    // 필터링된 데이터
    const filteredStubs = useMemo(() => {
        if (!searchTerm) return stubs;
        return stubs.filter(s => 
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [stubs, searchTerm]);

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return false;

        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                stubs: stubs,
            };
            
            // TODO: 실제 API 연결 시 주석 해제
            // const result = await saveStubSettings.mutateAsync(payload);
            console.log("Saving stubs with payload:", payload);
            
            modal.showAlert('알림', '스터브 설정이 성공적으로 저장되었습니다.');
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
        setStubs(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    return (
        <div className="dp-request-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 상단 통합 제어 바 */}
            <div className="dp-setting-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="dp-step-badge">Step 3</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>스터브(Stub) 문항 설정</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>분석표의 행(Row)으로 사용될 문항들의 순서와 옵션을 관리합니다.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="dp-search-input-wrapper" style={{ width: '240px' }}>
                            <Search size={14} className="dp-search-input-icon" />
                            <input 
                                type="text" 
                                placeholder="문항명/ID 검색..." 
                                className="dp-search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="dp-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} />
                            <span>문항 추가</span>
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
                        <List size={16} />
                        <span>문항 목록 ({filteredStubs.length})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Filter size={12} /> 드래그로 순서 변경 가능</span>
                    </div>
                </div>
                <div className="dp-grid-wrapper" style={{ flex: 1, padding: '12px' }}>
                    <KendoGridV2 
                        data={filteredStubs}
                        reorderable
                        addable
                        deletable
                        showNo
                        onDataChange={handleDataChange}
                        style={{ height: '100%' }}
                    >
                        <Column field="id" title="문항 ID" width="120px" editable={false} />
                        <Column field="name" title="문항명 (Label)" width="450px" />
                        <Column field="type" title="유형" width="120px" editable={false} 
                            cell={(props) => (
                                <td style={{ textAlign: 'center' }}>
                                    <span className={`dp-badge-mini ${String(props.dataItem.type).toLowerCase() === 'single' ? 'blue' : 'gray'}`}>
                                        {props.dataItem.type}
                                    </span>
                                </td>
                            )}
                        />
                        <Column field="base" title="Base 설정" width="150px" />
                        <Column 
                            field="show" 
                            title="표시" 
                            width="80px" 
                            cell={(props) => (
                                <td style={{ textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={props.dataItem.show} 
                                        onChange={(e) => {
                                            const next = stubs.map(s => s.id === props.dataItem.id ? { ...s, show: e.target.checked } : s);
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

export default DpRequestTableStep;

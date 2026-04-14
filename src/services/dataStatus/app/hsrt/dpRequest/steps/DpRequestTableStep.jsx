import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Save, Search, ChevronDown, RotateCcw, ArrowRight } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import { useRef } from 'react';

const DpRequestTableStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { getRecodedOverview } = DpRequestPageApi();

    const [searchTerm, setSearchTerm] = useState('');
    const [stubs, setStubs] = useState([]);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-table');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        },
        reset: () => {
            fetchOverview(); // 초기화 시 다시 불러옴
        }
    }));

    // 오버뷰 데이터 로드 (API)
    const fetchOverview = useCallback(async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return;

        try {
            loadingSpinner.show();
            const payload = {
                user: auth?.user?.userId,
                pageid: pageId,
            };
            const response = await getRecodedOverview.mutateAsync(payload);
            
            // 유연한 응답 경로 탐색 (Axios 래퍼, resultjson 분기 완벽 대비)
            const rawData = response?.data || response || {};
            const resultData = rawData.resultjson || rawData;
            
            // 1. 이미 저장된 Recoded 정보가 있으면 우선순위
            let items = resultData.dp_request_recoded_items || [];
            
            // 2. 만약 저장된 내용이 하나도 없으면 (최초 의뢰 작성 시) base_variables를 가공하여 초기 구성
            if (items.length === 0 && resultData.base_variables) {
                items = Object.values(resultData.base_variables).map((bv, index) => ({
                    id: bv.id,
                    name: bv.label || bv.id,
                    type: bv.type?.toUpperCase() || 'OPTION',
                    condition: '',
                    banner: 'banner_01', 
                    groupPreset: '',
                    statSetting: '통계 설정 열기',
                    scalePreset: '',
                    rankPreset: ''
                }));
            }

            console.log("Parsed Overview Items:", items, "from result:", resultData);

            setStubs(items);
            history.reset(items); // 히스토리 기준점 재설정
            if (onUnsavedChange) onUnsavedChange(false);
        } catch (err) {
            console.error("fetchOverview Error:", err);
            modal.showAlert('오류', '스터브 데이터를 불러오는 데 실패했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    }, [auth?.user?.userId, getRecodedOverview, history, loadingSpinner, modal, onUnsavedChange]);

    // 초기 마운트 시 데이터 로컬
    useEffect(() => {
        fetchOverview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 필터링된 데이터
    const filteredStubs = useMemo(() => {
        if (!searchTerm) return stubs;
        return stubs.filter(s =>
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [stubs, searchTerm]);

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setStubs([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setStubs([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setStubs([...redoData]);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    // 데이터 변경 감지 및 히스토리 커밋
    useEffect(() => {
        if (isHistoryAction.current) {
            isHistoryAction.current = false;
            return;
        }
        if (stubs.length > 0) {
            history.commit(stubs);
        }
    }, [stubs, history]);

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

    // --- 컬럼 렌더러 ---
    const TypeCell = (props) => {
        const val = props.dataItem.type || '';
        const upperVal = val.toUpperCase();

        // 전달 받은 공통 문항 유형 (color) 로직 적용
        let typeClass = 'dummy'; // 기본값
        const rawType = val.toLowerCase();

        if (rawType === 'single' || rawType === 'option') {
            typeClass = 'single';
        } else if (rawType === 'multi') {
            typeClass = 'multi';
        } else if (rawType === 'rank') {
            typeClass = 'rank';
        } else if (rawType === 'minrank') {
            typeClass = 'minrank';
        } else if (rawType === 'maxrank') {
            typeClass = 'maxrank';
        } else if (rawType === 'scale') {
            typeClass = 'scale';
        } else if (rawType === 'dummy') {
            typeClass = 'dummy';
        } else if (rawType === 'custom') {
            typeClass = 'custom';
        } else if (rawType === 'double' || rawType.includes('숫자')) {
            typeClass = 'open-num';
        } else if (rawType.includes('문자') || rawType.includes('open')) {
            typeClass = 'open-text';
        }

        return (
            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <span className={`question-type-badge ${typeClass}`}>
                    {val}
                </span>
            </td>
        );
    };

    const DropdownCell = (props) => {
        const field = props.field;
        const val = props.dataItem[field];
        const isHighlight = val === 'mean';
        return (
            <td style={{ backgroundColor: isHighlight ? '#fee2e2' : 'transparent', padding: '0 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '12px', color: '#333' }}>
                    <span>{val}</span>
                    <ChevronDown size={14} style={{ color: '#64748b' }} />
                </div>
            </td>
        );
    };

    return (
        <div className="dp-request-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 메인 리스트 카드 (실행모델/현재상태 생략) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        전체 <span style={{ color: '#2563eb' }}>{filteredStubs.length}</span>건
                    </div>
                </div>
                <div className="dp-grid-content-v2" style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <KendoGridV2
                            data={filteredStubs}
                            reorderable={false}
                            showNo={true}
                            onDataChange={handleDataChange}
                            style={{ height: '100%', border: 'none' }}
                            scrollable="virtual"
                            rowHeight={28}
                        >
                            <Column field="id" title="ID" width="100px" editable={false} headerClassName="k-text-center" />
                            <Column field="name" title="라벨" width="300px" headerClassName="k-text-center" />
                            <Column field="type" title="유형" width="100px" editable={false} cell={TypeCell} headerClassName="k-text-center" />
                            <Column field="condition" title="조건" width="150px" headerClassName="k-text-center" />
                            <Column field="banner" title="배너(x_info)" width="150px" editable={false} headerClassName="k-text-center" />
                            <Column field="groupPreset" title="그룹 프리셋" width="150px" cell={DropdownCell} headerClassName="k-text-center" />
                            <Column field="statSetting" title="통계 설정" width="150px" cell={DropdownCell} headerClassName="k-text-center" />
                            <Column field="scalePreset" title="척도 프리셋" width="150px" cell={DropdownCell} headerClassName="k-text-center" />
                            <Column field="rankPreset" title="순위 프리셋" width="150px" cell={DropdownCell} headerClassName="k-text-center" />
                        </KendoGridV2>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default DpRequestTableStep;

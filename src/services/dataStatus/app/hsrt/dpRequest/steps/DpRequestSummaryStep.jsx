import React, { useState, useEffect, useContext, useCallback, useMemo, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Save, Trash2, ChevronDown, ChevronUp, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X, Wand2, Folder, Copy } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';

// --- (성능 개선) 개별 아이템 메모이제이션 ---
const VariableItem = memo(({ v, isSelected, onDragStart, onClick }) => (
    <div
        className={`variable-item ${isSelected ? 'selected' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, v)}
        onClick={(e) => { e.stopPropagation(); onClick(v.id); }}
        style={{ borderRadius: '6px' }}
    >
        <div className="variable-item-header">
            <div className="variable-item__name">{v.id}</div>
            {v.type && <span className={`question-type-badge ${String(v.type).toLowerCase()}`}>{v.type}</span>}
        </div>
        <div className="variable-item__label">{v.label}</div>
    </div>
));

// --- (컴팩트 디자인 & 여유로운 패딩) 요약표 생성 전용 푸터 바 ---
const SummaryActionFooter = memo(({ onCreateSummary }) => {
    const [localName, setLocalName] = useState('');
    return (
        <div style={{
            padding: '14px 16px 0px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>요약표명</span>
                <input
                    type="text"
                    placeholder="요약표명을 입력하세요"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="dp-input"
                    style={{ flex: 1, maxWidth: '500px' }}
                />
            </div>
            <button
                className="dp-primary-btn"
                onClick={() => onCreateSummary(localName)}
                style={{
                    height: '32px',
                    padding: '0 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                요약표 생성
            </button>
        </div>
    );
});

const DpRequestSummaryStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getSummaryDetail, getBaseVariableList, generateSummary, saveSummaryDetail } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-summary');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSaveSummary();
        }
    }));

    const [summaries, setSummaries] = useState([]);
    const [selectedSummary, setSelectedSummary] = useState('');
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [isSummarySidebarOpen, setIsSummarySidebarOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [summarySearch, setSummarySearch] = useState('');
    const [colVars, setColVars] = useState([]);
    const [currentLabel, setCurrentLabel] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // --- 삭제 관리용 스테이트 추가 ---
    const [deletedSummaryIds, setDeletedSummaryIds] = useState([]); // 서버에 실제 삭제 요청할 ID들
    const [originalSummaryIds, setOriginalSummaryIds] = useState([]); // 초기 로딩된 요약표 ID 목록 (신규 구분용)
    const [collapsedFolders, setCollapsedFolders] = useState(new Set()); // 아코디언 상태 관리용

    const toggleFolderCollapse = (folderId) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setSummaries([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setSummaries([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setSummaries([...redoData]);
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
        if (summaries.length > 0) {
            history.commit(summaries);
        }
    }, [summaries, history]);

    // --- Interaction Logic ---
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const handleDragStart = useCallback((e, draggedVar) => {
        let targets = [];
        if (selectedIds.includes(draggedVar.id)) {
            targets = baseVariables.filter(v => selectedIds.includes(v.id));
        } else {
            targets = [draggedVar];
            setSelectedIds([draggedVar.id]);
        }
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'EXTERNAL', items: targets }));
    }, [selectedIds, baseVariables]);

    const handleInternalItemDragStart = (e, gIdx, iIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_ITEM', gIdx, iIdx }));
    };

    const handleInternalGroupDragStart = (e, gIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_GROUP', gIdx }));
    };

    const handleDrop = (e, targetIdx) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);

            setColVars(prev => {
                let next = [...prev.map(g => [...g])];
                if (data.type === 'INTERNAL_ITEM') {
                    const item = next[data.gIdx][data.iIdx];
                    next[data.gIdx].splice(data.iIdx, 1);
                    if (targetIdx === 'new') {
                        if (next.length >= 10) {
                            modal.showAlert('알림', '최대 10개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push([item]);
                    } else {
                        if (!next[targetIdx].find(v => v.id === item.id)) {
                            if (next[targetIdx].length >= 3) {
                                modal.showAlert('알림', '한 그룹에는 최대 3개 문항까지만 넣을 수 있습니다.');
                                return prev;
                            }
                            next[targetIdx].push(item);
                        } else if (data.gIdx === targetIdx) {
                            next[targetIdx].splice(data.iIdx, 0, item);
                        }
                    }
                    return next.filter(g => g.length > 0);
                }
                if (data.type === 'INTERNAL_GROUP') {
                    const group = next[data.gIdx];
                    next.splice(data.gIdx, 1);
                    if (targetIdx === 'new') {
                        if (next.length >= 10) {
                            modal.showAlert('알림', '최대 10개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push(group);
                    } else next.splice(targetIdx, 0, group);
                    return next;
                }
                if (data.type === 'EXTERNAL') {
                    const itemsToAdd = data.items;
                    if (targetIdx === 'new') {
                        // 새로 추가되면서 10개를 넘는지 체크
                        if (next.length + itemsToAdd.length > 10) {
                            modal.showAlert('알림', '최대 10개 그룹까지만 구성할 수 있습니다.');
                            // 가능힌 부분까지만 추가하거나 아예 안하거나 결정 (여기서는 안전하게 경고 후 중단)
                            return prev;
                        }
                        next.push(...itemsToAdd.map(it => [it]));
                    } else {
                        const unique = itemsToAdd.filter(it => !next[targetIdx].find(v => v.id === it.id));
                        if (next[targetIdx].length + unique.length > 3) {
                            modal.showAlert('알림', '한 그룹에는 최대 3개 문항까지만 넣을 수 있습니다.');
                            return prev;
                        }
                        next[targetIdx] = [...next[targetIdx], ...unique];
                    }
                }
                return next;
            });
            setSelectedIds([]);
        } catch (err) { console.error(err); }
    };

    const removeVar = (varId, groupIndex) => {
        setColVars(prev => {
            const next = prev.map(g => [...g]);
            next[groupIndex] = next[groupIndex].filter(v => v.id !== varId);
            return next.filter(g => g.length > 0);
        });
    };

    const handleDeleteSummary = (e, summaryId) => {
        e.stopPropagation();
        modal.showConfirm('삭제 확인', `요약표(${summaryId})를 삭제하시겠습니까?`, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        const pageId = sessionStorage.getItem('pageId');
                        if (!pageId) return;

                        try {
                            loadingSpinner.show();
                            const requestData = {
                                pageid: pageId,
                                user: auth?.user?.userId,
                                variables: {},
                                delete_ids: [summaryId]
                            };

                            const result = await saveSummaryDetail.mutateAsync(requestData);
                            if (result?.success === "777") {
                                modal.showAlert('알림', '요약표가 삭제되었습니다.');
                                await fetchSummaryData();
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            modal.showAlert('오류', '요약표 삭제 중 문제가 발생했습니다.');
                        } finally {
                            loadingSpinner.hide();
                        }
                    }
                }
            ]
        });
    };

    // --- 데이터 로직 ---
    const fetchSummaryData = async (isFresh = false) => {
        const pageId = sessionStorage.getItem('pageId');
        const userId = auth?.user?.userId || '';
        
        try {
            loadingSpinner.show();
            const result = await getSummaryDetail.mutateAsync({ pageid: pageId, user: userId });
            if (result?.success === '777' && result.resultjson) {
                if (result.resultjson.base_variables) {
                    const baseVars = result.resultjson.base_variables;
                    setBaseVariables(Array.isArray(baseVars) ? baseVars : Object.values(baseVars));
                }
                if (result.resultjson.dp_request_summary_folders) {
                    setFolders(result.resultjson.dp_request_summary_folders);
                }
                if (result.resultjson.recoded_variables) {
                    const raw = result.resultjson.recoded_variables;
                    const recodes = Array.isArray(raw) ? raw : Object.values(raw);
                    const formatted = recodes.map((v, i) => ({
                        id: v.id || `var_${i}`,
                        label: v.name || v.label,
                        subId: v.id || `summary_0${i + 1}`,
                        info: (v.info || v.categories || []).map(item => ({ ...item, inEdit: false }))
                    }));
                    setSummaries(formatted);
                    history.reset(formatted); // 초기 히스토리 기준점을 서버 데이터로 설정

                    // 서버에서 온 원본 ID들 보관
                    const ids = formatted.map(b => b.id);
                    setOriginalSummaryIds(ids);
                    setDeletedSummaryIds([]); // 삭제 목록 초기화

                    if (formatted.length > 0) {
                        const target = isFresh ? formatted[formatted.length - 1] : formatted[0];
                        if (isFresh || !selectedSummary) {
                            setSelectedSummary(target.id);
                            setCurrentLabel(target.label);
                        }
                    }
                }
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const handleCreateSummary = async (name) => {
        if (!name?.trim()) return modal.showAlert('알림', '요약표명을 입력해 주세요.');
        if (colVars.length === 0) return modal.showAlert('알림', '구성된 문항이 없습니다.');
        const pageId = sessionStorage.getItem('pageId');
        const formula = colVars.map(group => group.map(v => v.id).join('*')).join('+');
        try {
            loadingSpinner.show();
            const result = await generateSummary.mutateAsync({ pageid: pageId, formula, label: name, user: auth?.user?.userId });
            if (result?.success === "777") {
                await fetchSummaryData(true);
                setColVars([]);
                setIsWizardOpen(false);
                modal.showAlert('알림', '요약표가 생성되었습니다.');
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const updateSummaryInfo = useCallback((newInfo) => {
        setSummaries(prev => prev.map(b => b.id === selectedSummary ? { ...b, info: newInfo } : b));
    }, [selectedSummary]);

    const summaryVariables = useMemo(() => {
        return (Array.isArray(baseVariables) ? baseVariables : []).filter(v => 
            v.type === 'scale' || v.type === 'double'
        ).map(v => {
            const scalePoints = v.scale_points || (v.info && v.info.filter(row => row.type && row.type !== 'mean' && row.type !== 'median' && row.type !== 'mode' && !row.type.includes('base')).length) || null;
            return {
                ...v,
                base_id: v.id,
                scale_points: scalePoints
            };
        });
    }, [baseVariables]);

    const filteredSummaryVariables = useMemo(() => {
        const search = summarySearch.toLowerCase();
        return summaryVariables.filter(v =>
            (v.label || '').toLowerCase().includes(search) || (v.base_id || '').toLowerCase().includes(search)
        );
    }, [summaryVariables, summarySearch]);

    // 요약표 목록 필터링 (일단 유지)
    const filteredSummaries = useMemo(() => {
        const search = summarySearch.toLowerCase();
        return summaries.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [summaries, summarySearch]);

    useEffect(() => { fetchSummaryData(); }, [auth?.user?.userId]);

    useEffect(() => {
        const fetchBaseVariables = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;
            try {
                const result = await getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user.userId });
                if (result?.success === '777' && result.resultjson) setBaseVariables(Object.values(result.resultjson));
            } catch (error) { }
        };
        fetchBaseVariables();
    }, [auth?.user?.userId]);

    const handleSaveSummary = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!selectedSummary || !pageId) return;

        const currentSummaryData = summaries.find(b => b.id === selectedSummary);
        if (!currentSummaryData) return;

        // API 명세서 형식에 맞게 데이터 가공
        const requestData = {
            pageid: pageId,
            user: auth?.user?.userId, // 사용자ID 추가
            variables: {
                [currentSummaryData.id]: {
                    id: currentSummaryData.id,
                    label: currentLabel, // 수정된 라벨 사용
                    type: "single", // 기본값
                    recoded_type: "recoded",
                    info: currentSummaryData.info.map(it => ({
                        label3: it.label3,
                        label2: it.label2,
                        label: it.label,
                        logic: it.logic
                    }))
                }
            },
            delete_ids: []
        };

        try {
            loadingSpinner.show();
            const result = await saveSummaryDetail.mutateAsync(requestData);
            if (result?.success === "777") {
                modal.showAlert('알림', '요약표 정보가 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false); // 저장 성공 시 더티 해제
                await fetchSummaryData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Save error:', error);
            modal.showAlert('오류', '요약표 저장 중 문제가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    return (
        <div className="dp-request-container" onClick={() => updateSummaryInfo(summaries.find(b => b.id === selectedSummary)?.info.map(it => ({ ...it, inEdit: false })) || [])}>
            {/* 1. 상단 요약표 관리 카드 */}
            <div className="dp-setting-card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Wand2 size={14} />
                            <span>척도형 자동 요약표 생성</span>
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Plus size={14} />
                            <span>빈도 요약표 추가</span>
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Plus size={14} />
                            <span>통계 요약표 추가</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. 메인 레이아웃 */}
            <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                <div className={`dp-sidebar-container ${!isSummarySidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                    {!isSummarySidebarOpen && (
                        <div className="dp-sidebar-collapsed-bar" onClick={() => setIsSummarySidebarOpen(true)}>
                            <div className="dp-collapsed-header">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    )}
                    <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                            <span>원본 변수 목록 ({filteredSummaryVariables.length})</span>
                            <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsSummarySidebarOpen(false)}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                        <div className="dp-sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <DropDownList
                                className="dp-summary-dropdown"
                                data={folders}
                                    textField="name"
                                    dataItemKey="id"
                                    value={folders.find(f => f.id === selectedFolderId) || null}
                                    defaultItem={{ id: '', name: '추가할 폴더 선택' }}
                                    onChange={(e) => {
                                        if (e.target.value?.id) {
                                            setSelectedFolderId(e.target.value.id);
                                        } else {
                                            setSelectedFolderId('');
                                        }
                                    }}
                                    style={{ width: '100%', height: '32px' }}
                            />
                            <div className="dp-search-input-wrapper" style={{ width: '100%' }}>
                                <Search size={14} className="dp-search-input-icon" />
                                <input
                                    type="text"
                                    placeholder="변수명 또는 ID 검색"
                                    value={summarySearch}
                                    onChange={(e) => setSummarySearch(e.target.value)}
                                    className="dp-search-input"
                                />
                            </div>
                        </div>
                        <div className="dp-summary-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px' }}>
                            {filteredSummaryVariables.map(variable => (
                                <div key={variable.base_id}
                                    className="dp-variable-row"
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        padding: '8px', border: '1px solid #e2e8f0', 
                                        borderRadius: '6px', marginBottom: '8px', background: '#fff' 
                                    }}
                                >
                                    <span style={{ width: '40px', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{variable.base_id}</span>
                                    <div style={{ width: '1px', height: '12px', backgroundColor: '#e2e8f0' }} />
                                    <span style={{ flex: 1, fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{variable.label}</span>
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: '#f1f5f9', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {variable.type === 'scale' ? (variable.scale_points ? `${variable.scale_points}점 척도` : '척도형') : '숫자형'}
                                    </span>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', borderRadius: '4px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}
                                        onClick={() => {
                                            // TODO: 요약표 폴더에 변수 추가 로직 연결
                                        }}
                                        title="변수 추가"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingLeft: '16px' }}>
                    <div className="dp-table-container custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
                        {folders.map((folder) => (
                            <div key={folder.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px', background: '#fff' }}>
                                {/* Folder Header */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0' }}>
                                    <Folder size={18} color="#64748b" />
                                    <input 
                                        type="text" 
                                        value={folder.name} 
                                        onChange={(e) => {
                                            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: e.target.value } : f));
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8', marginLeft: '8px', border: 'none', background: 'transparent', outline: 'none', width: '250px' }}
                                    />
                                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                                        <span style={{ padding: '2px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', color: '#64748b' }}>
                                            {folder.type === 'statistics' ? '통계 요약' : '빈도 요약'}
                                        </span>
                                        {folder.id.includes('auto') && (
                                            <span style={{ padding: '2px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', color: '#64748b' }}>
                                                자동 생성됨
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', color: '#64748b', alignItems: 'center' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                            <Copy size={16} />
                                        </button>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                            <X size={16} />
                                        </button>
                                        <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px' }} />
                                        <button onClick={() => toggleFolderCollapse(folder.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}>
                                            {collapsedFolders.has(folder.id) ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                        </button>
                                    </div>
                                </div>
                                {/* Folder Body */}
                                {!collapsedFolders.has(folder.id) && (
                                <div style={{ padding: '16px' }}>
                                    {folder.type === 'frequency' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', fontSize: '12px' }}>
                                            <span style={{ fontWeight: 600, color: '#475569', marginRight: '16px' }}>포함 코드</span>
                                            <input
                                                type="text"
                                                placeholder="예: 4,5"
                                                value={folder.include_codes || ''}
                                                onChange={(e) => {
                                                    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, include_codes: e.target.value } : f));
                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                }}
                                                style={{ color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', outline: 'none', width: '200px' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', fontSize: '12px', gap: '20px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={folder.mean || false} onChange={(e) => {
                                                    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mean: e.target.checked } : f));
                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                }} style={{ cursor: 'pointer', appearance: 'checkbox', WebkitAppearance: 'checkbox', width: '16px', height: '16px', opacity: 1, display: 'inline-block', position: 'relative' }} />
                                                <span style={{ fontWeight: 600, color: '#475569' }}>평균</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={folder.mode || false} onChange={(e) => {
                                                    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mode: e.target.checked } : f));
                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                }} style={{ cursor: 'pointer', appearance: 'checkbox', WebkitAppearance: 'checkbox', width: '16px', height: '16px', opacity: 1, display: 'inline-block', position: 'relative' }} />
                                                <span style={{ fontWeight: 600, color: '#475569' }}>최빈값</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={folder.median || false} onChange={(e) => {
                                                    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, median: e.target.checked } : f));
                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                }} style={{ cursor: 'pointer', appearance: 'checkbox', WebkitAppearance: 'checkbox', width: '16px', height: '16px', opacity: 1, display: 'inline-block', position: 'relative' }} />
                                                <span style={{ fontWeight: 600, color: '#475569' }}>중앙값</span>
                                            </label>
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
                                        {/* items 매핑 로직 (folder.items 배열 값이 문자열 id라고 가정) */}
                                        {(folder.items || []).length > 0 ? (folder.items || []).map(itemId => {
                                            const itemInfo = summaryVariables.find(v => v.base_id === itemId);
                                            const label = itemInfo ? itemInfo.label : '';
                                            return (
                                                <div key={itemId} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '16px', background: '#fff', gap: '6px' }}>
                                                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', flexShrink: 0 }}>{itemId}</span>
                                                    <span title={label} style={{ color: '#64748b', fontSize: '13px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: '#94a3b8', flexShrink: 0 }}>
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            );
                                        }) : (
                                            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px 0' }}>변수가 추가되지 않았습니다.</div>
                                        )}
                                    </div>
                                </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default DpRequestSummaryStep;

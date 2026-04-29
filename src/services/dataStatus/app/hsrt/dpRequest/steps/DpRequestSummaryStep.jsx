import React, { useState, useEffect, useContext, useCallback, useMemo, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X, Wand2, Folder, Copy } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';



const DpRequestSummaryStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getSummaryDetail, getBaseVariableList, generateSummaryAuto, saveSummaryDetail } = DpRequestPageApi();
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
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

    // --- 삭제 관리용 스테이트 추가 ---
    const [deletedSummaryIds, setDeletedSummaryIds] = useState([]); // 서버에 실제 삭제 요청할 ID들
    const [originalSummaryIds, setOriginalSummaryIds] = useState([]); // 초기 로딩된 요약표 ID 목록 (신규 구분용)
    const [originalFolderIds, setOriginalFolderIds] = useState([]); // 초기 로딩된 폴더 ID 목록 (신규 생성 구분용)
    const [collapsedFolders, setCollapsedFolders] = useState(new Set()); // 아코디언 상태 관리용
    const [dragOverTarget, setDragOverTarget] = useState({ folderId: null, idx: null }); // 드래그 오버 상태 관리

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



    const handleFolderDrop = useCallback((e, folderId, targetIdx = -1) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverTarget({ folderId: null, idx: null });
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);
            const targetFolder = folders.find(f => f.id === folderId);
            if (!targetFolder) return;

            const isFrequencyFolder = targetFolder.type !== 'statistics';

            if (data.type === 'EXTERNAL') {
                if (isFrequencyFolder) {
                    const hasNumeric = data.items.some(it => it.type === 'double' || it.type === 'numeric');
                    if (hasNumeric) {
                        modal.showAlert('알림', '숫자형 변수는 빈도 요약 폴더에 추가할 수 없습니다.');
                        return;
                    }
                }

                const itemsToAdd = data.items.map(it => it.base_id || it.id);

                const existingItems = targetFolder.items || [];
                const hasDuplicates = itemsToAdd.some(id => existingItems.includes(id));
                const uniqueItemsToAdd = itemsToAdd.filter(id => !existingItems.includes(id));

                if (uniqueItemsToAdd.length > 0) {
                    setFolders(prev => prev.map(f => {
                        if (f.id === folderId) {
                            const newItems = [...(f.items || [])];
                            if (targetIdx === -1) {
                                newItems.push(...uniqueItemsToAdd);
                            } else {
                                newItems.splice(targetIdx, 0, ...uniqueItemsToAdd);
                            }
                            return { ...f, items: newItems };
                        }
                        return f;
                    }));
                    if (onUnsavedChange) onUnsavedChange(true);
                }

                if (hasDuplicates) {
                    if (uniqueItemsToAdd.length === 0) {
                        modal.showAlert('알림', '이미 추가된 문항입니다.');
                    } else {
                        modal.showAlert('알림', '이미 등록된 항목을 제외하고 추가했습니다.');
                    }
                }

                setSelectedIds([]);
            } else if (data.type === 'INTERNAL_FOLDER_ITEM') {
                const { folderId: sourceFolderId, itemId } = data;

                if (isFrequencyFolder) {
                    const varData = baseVariables.find(v => v.id === itemId);
                    if (varData && (varData.type === 'double' || varData.type === 'numeric')) {
                        modal.showAlert('알림', '숫자형 변수는 빈도 요약 폴더에 추가할 수 없습니다.');
                        return;
                    }
                }

                setFolders(prev => {
                    let next = prev.map(f => ({ ...f, items: [...(f.items || [])] }));
                    const srcF = next.find(f => f.id === sourceFolderId);
                    const tgtF = next.find(f => f.id === folderId);

                    if (!srcF || !tgtF) return prev;
                    if (sourceFolderId !== folderId && tgtF.items.includes(itemId)) {
                        return prev; // 중복 이동 방지
                    }

                    const srcIdx = srcF.items.indexOf(itemId);
                    if (srcIdx === -1) return prev;

                    srcF.items.splice(srcIdx, 1);

                    let insertIdx = targetIdx;
                    if (insertIdx === -1) {
                        tgtF.items.push(itemId);
                    } else {
                        if (sourceFolderId === folderId && targetIdx > srcIdx) {
                            insertIdx = targetIdx - 1;
                        }
                        tgtF.items.splice(insertIdx, 0, itemId);
                    }

                    return next;
                });
                if (onUnsavedChange) onUnsavedChange(true);
            }
        } catch (err) { console.error(err); }
    }, [folders, onUnsavedChange, modal]);

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
            // TODO: 임시 하드코딩
            const result = await getSummaryDetail.mutateAsync({ pageid: pageId, user: userId });
            // const result = await getSummaryDetail.mutateAsync({ pageid: "446bd14c-d053-47c8-bf01-59384cb37746", user: "sbbok" });
            if (result?.success === '777' && result.resultjson) {
                if (result.resultjson.summary_source_variables) {
                    const sourceVars = result.resultjson.summary_source_variables;
                    setBaseVariables(Array.isArray(sourceVars) ? sourceVars : Object.values(sourceVars));
                }
                if (result.resultjson.dp_request_summary_folders) {
                    setFolders(result.resultjson.dp_request_summary_folders);
                    setOriginalFolderIds(result.resultjson.dp_request_summary_folders.map(f => f.id));
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
            // TODO: 기존 generateSummary 가 미구현 상태였음 일단 유지
            modal.showAlert('알림', '기존 수동 생성 API는 정의되지 않았습니다');
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const handleAutoGenerateSummary = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return;
        try {
            loadingSpinner.show();
            // TODO: 임시 하드코딩
            const result = await generateSummaryAuto.mutateAsync({ pageid: pageId, user: auth?.user?.userId, append_mode: true });
            // const result = await generateSummaryAuto.mutateAsync({ pageid: "446bd14c-d053-47c8-bf01-59384cb37746", user: "sbbok", append_mode: true });

            if (result && result.folders) {
                setFolders(prev => [...prev, ...result.folders]);
                if (onUnsavedChange) onUnsavedChange(true);
                modal.showAlert('알림', `${result.generated_folder_count}개의 척도형 요약표가 자동 생성되었습니다.`);
            }
        } catch (error) {
            console.error('Auto generate error:', error);
            modal.showAlert('오류', '척도형 요약표 자동 생성 중 문제가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleSaveSummary = async (overrideFolders = null, overrideDeleteIds = null, successMessage = '요약표가 저장되었습니다.') => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return false;

        const variablesPayload = {};
        summaries.forEach(s => {
            variablesPayload[s.id] = {
                id: s.id,
                label: s.label,
                type: s.type,
                info: s.info || []
            };
        });

        const payload = {
            // TODO: 임시 하드코딩
            pageid: pageId,
            user: auth?.user?.userId,
            // pageid: "446bd14c-d053-47c8-bf01-59384cb37746",
            // user: "sbbok",
            folders: overrideFolders || folders,
            variables: variablesPayload,
            delete_ids: overrideDeleteIds || deletedSummaryIds
        };

        try {
            loadingSpinner.show();
            const result = await saveSummaryDetail.mutateAsync(payload);
            if (result?.success === "777" || result?.message) {
                if (onUnsavedChange) onUnsavedChange(false);
                modal.showAlert('알림', successMessage);
                await fetchSummaryData(); // 재조회 실행
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

    const updateSummaryInfo = useCallback((newInfo) => {
        setSummaries(prev => prev.map(b => b.id === selectedSummary ? { ...b, info: newInfo } : b));
    }, [selectedSummary]);

    const summaryVariables = useMemo(() => {
        return (Array.isArray(baseVariables) ? baseVariables : []).map(v => {
            const scalePoints = v.scale_points || (v.info && v.info.filter(row => row.type && row.type !== 'mean' && row.type !== 'median' && row.type !== 'mode' && !row.type.includes('base')).length) || null;
            return {
                ...v,
                id: v.id || v.base_id,
                base_id: v.base_id || v.id,
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

    const toggleSelection = useCallback((e, index, id) => {
        if (e.shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== index) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const rangeIds = filteredSummaryVariables.slice(start, end + 1).map(v => v.id || v.base_id);

            setSelectedIds(prev => {
                const next = new Set(prev);
                rangeIds.forEach(rid => next.add(rid));
                return Array.from(next);
            });
            setLastSelectedIndex(index);
        } else {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            setLastSelectedIndex(index);
        }
    }, [filteredSummaryVariables, lastSelectedIndex]);

    // 요약표 목록 필터링 (일단 유지)
    const filteredSummaries = useMemo(() => {
        const search = summarySearch.toLowerCase();
        return summaries.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [summaries, summarySearch]);

    useEffect(() => { 
        fetchSummaryData(); 
        const handlePageUpdate = () => fetchSummaryData();
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [auth?.user?.userId]);

    useEffect(() => {
        // 백엔드에서 summary_source_variables 로 한 번에 가져오므로
        // 개별 원본 목록 조회 API(getBaseVariableList)는 주석 처리합니다.
    }, [auth?.user?.userId]);



    return (
        <div className="dp-request-container" onClick={() => updateSummaryInfo(summaries.find(b => b.id === selectedSummary)?.info.map(it => ({ ...it, inEdit: false })) || [])}>
            {/* 1. 상단 요약표 관리 카드 */}
            <div className="dp-setting-card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleAutoGenerateSummary}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Wand2 size={14} />
                            <span>척도형 자동 요약표 생성</span>
                        </button>
                        <button
                            onClick={() => {
                                const count = folders.filter(f => f.type === 'frequency').length + 1;
                                const newFolder = {
                                    id: `folder_freq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                    name: `빈도 요약표 ${count}`,
                                    type: 'frequency',
                                    include_codes: '',
                                    items: []
                                };
                                setFolders(prev => [...prev, newFolder]);
                                if (onUnsavedChange) onUnsavedChange(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Plus size={14} />
                            <span>빈도 요약표 추가</span>
                        </button>
                        <button
                            onClick={() => {
                                const count = folders.filter(f => f.type === 'statistics').length + 1;
                                const newFolder = {
                                    id: `folder_stat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                    name: `통계 요약표 ${count}`,
                                    type: 'statistics',
                                    mean: true,
                                    mode: false,
                                    median: false,
                                    items: []
                                };
                                setFolders(prev => [...prev, newFolder]);
                                if (onUnsavedChange) onUnsavedChange(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
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
                        <div className="dp-sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 12px 8px 12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '4px 0', background: '#f8fafc', borderRadius: '4px' }}>
                                클릭 및 드래그하여 우측 표에 추가하세요. (다중 선택 가능)
                            </div>
                            <div className="dp-search-input-wrapper" style={{ width: '100%', marginBottom: '0' }}>
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
                            {filteredSummaryVariables.map((variable, idx) => (
                                <div key={variable.base_id}
                                    className={`dp-variable-row ${selectedIds.includes(variable.id) ? 'selected' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, variable)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelection(e, idx, variable.id);
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '4px 8px', border: '1px solid',
                                        borderRadius: '6px', marginBottom: '4px',
                                        background: selectedIds.includes(variable.id) ? '#eff6ff' : '#fff',
                                        borderColor: selectedIds.includes(variable.id) ? '#3b82f6' : '#e2e8f0',
                                        cursor: 'grab'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(variable.id)}
                                        readOnly
                                        style={{ cursor: 'pointer', margin: 0, width: '14px', height: '14px' }}
                                    />
                                    <span
                                        style={{ flexShrink: 0, fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}
                                        title={variable.base_id}
                                    >
                                        {variable.base_id}
                                    </span>
                                    <span style={{ flex: 1, fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '4px' }}>{variable.label}</span>
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: '#f1f5f9', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {variable.type === 'scale' ? (variable.scale_points ? `${variable.scale_points}점 척도` : '척도형') : '숫자형'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="dp-table-container custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '16px' }}>
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
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const baseMatch = folder.name.match(/^(.*?)(?:_복사본(?:\s+\d+)?)?$/);
                                                const baseName = baseMatch ? baseMatch[1] : folder.name;

                                                const copyNames = folders.map(f => f.name).filter(n => n.startsWith(baseName + "_복사본"));
                                                let maxNum = 0;
                                                copyNames.forEach(name => {
                                                    const numMatch = name.match(/_복사본(?:\s+(\d+))?$/);
                                                    if (numMatch) {
                                                        const num = numMatch[1] ? parseInt(numMatch[1], 10) : 1;
                                                        if (num > maxNum) maxNum = num;
                                                    }
                                                });
                                                const newName = `${baseName}_복사본 ${maxNum + 1}`;

                                                const newId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                                const newFolder = { ...folder, id: newId, name: newName, items: [...(folder.items || [])] };
                                                setFolders(prev => [...prev, newFolder]);
                                                if (onUnsavedChange) onUnsavedChange(true);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                modal.showConfirm('확인', '요약표를 삭제하시겠습니까?', {
                                                    btns: [
                                                        { title: "취소", click: () => { } },
                                                        {
                                                            title: "삭제",
                                                            click: async () => {
                                                                const newFolders = folders.filter(f => f.id !== folder.id);
                                                                setFolders(newFolders);

                                                                if (originalFolderIds.includes(folder.id)) {
                                                                    const newDeletedIds = [...deletedSummaryIds, folder.id];
                                                                    setDeletedSummaryIds(newDeletedIds);
                                                                    await handleSaveSummary(newFolders, newDeletedIds, '요약표가 삭제되었습니다.');
                                                                } else {
                                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                                }
                                                            }
                                                        }
                                                    ]
                                                });
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        >
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
                                        <div
                                            style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', minHeight: '60px', padding: '16px',
                                                border: dragOverTarget.folderId === folder.id && dragOverTarget.idx === -1 ? '2px solid #3b82f6' : '1px dashed #cbd5e1',
                                                borderRadius: '8px',
                                                background: dragOverTarget.folderId === folder.id && dragOverTarget.idx === -1 ? 'rgba(59, 130, 246, 0.05)' : '#f8fafc',
                                                transition: 'all 0.2s ease-out'
                                            }}
                                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverTarget({ folderId: folder.id, idx: -1 }); }}
                                            onDragLeave={() => setDragOverTarget({ folderId: null, idx: null })}
                                            onDrop={(e) => handleFolderDrop(e, folder.id)}
                                        >
                                            {/* items 매핑 로직 (folder.items 배열 값이 문자열 id라고 가정) */}
                                            {(folder.items || []).length > 0 ? (folder.items || []).map((itemId, idx) => {
                                                const itemInfo = summaryVariables.find(v => v.base_id === itemId);
                                                const label = itemInfo ? itemInfo.label : '';
                                                return (
                                                    <div key={itemId}
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.stopPropagation();
                                                            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_FOLDER_ITEM', folderId: folder.id, itemId }));
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            e.dataTransfer.dropEffect = 'move';
                                                            if (dragOverTarget.folderId !== folder.id || dragOverTarget.idx !== idx) {
                                                                setDragOverTarget({ folderId: folder.id, idx });
                                                            }
                                                        }}
                                                        onDragLeave={(e) => {
                                                            e.stopPropagation();
                                                            setDragOverTarget({ folderId: null, idx: null });
                                                        }}
                                                        onDrop={(e) => {
                                                            e.stopPropagation();
                                                            handleFolderDrop(e, folder.id, idx);
                                                        }}
                                                        style={{
                                                            position: 'relative',
                                                            display: 'flex', alignItems: 'center',
                                                            padding: '4px 8px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '16px',
                                                            background: '#fff',
                                                            gap: '4px', cursor: 'grab',
                                                            transition: 'all 0.1s'
                                                        }}
                                                    >
                                                        {/* 드롭 인디케이터 라인 (기존 항목들 사이에 끼워넣는다는 걸 명확히 표시) */}
                                                        {dragOverTarget.folderId === folder.id && dragOverTarget.idx === idx && (
                                                            <div style={{ position: 'absolute', left: '-4px', top: '10%', bottom: '10%', width: '3px', backgroundColor: '#3b82f6', borderRadius: '3px', zIndex: 10 }} />
                                                        )}
                                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', flexShrink: 0 }}>{itemId}</span>
                                                        <span title={label} style={{ color: '#64748b', fontSize: '11px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFolders(prev => prev.map(f => {
                                                                    if (f.id === folder.id) {
                                                                        return { ...f, items: f.items.filter(id => id !== itemId) };
                                                                    }
                                                                    return f;
                                                                }));
                                                                if (onUnsavedChange) onUnsavedChange(true);
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: '#94a3b8', flexShrink: 0 }}
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                );
                                            }) : (
                                                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px 0', pointerEvents: 'none' }}>변수가 추가되지 않았습니다.</div>
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

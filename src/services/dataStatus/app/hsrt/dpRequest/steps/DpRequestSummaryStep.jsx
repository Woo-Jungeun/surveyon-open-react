import React, { useState, useEffect, useContext, useCallback, useMemo, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X, Wand2, Folder, Copy, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';



const DpRequestSummaryStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getSummaryDetail, getBaseVariableList, generateSummaryAuto, saveSummaryDetail, getTableDetail } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const getVariableTooltip = useCallback((variable) => {
        const list = Array.isArray(variable.info) ? variable.info : (Array.isArray(variable.categories) ? variable.categories : []);
        const infoLabels = list.map(item => item.label).filter(Boolean);
        const base = `${variable.label || ''}${variable.base_id ? ` (${variable.base_id})` : ''}`;
        if (infoLabels.length > 0) {
            return `${base}\n\n[보기 목록]\n${infoLabels.map(l => `- ${l}`).join('\n')}`;
        }
        return base;
    }, []);

    const handleVariableMouseUp = useCallback((variable) => {
        const list = Array.isArray(variable.info) ? variable.info : (Array.isArray(variable.categories) ? variable.categories : []);
        const infoLabels = list.map(item => item.label).filter(Boolean);
        if (infoLabels.length > 0) {
            console.log(`[${variable.label} (${variable.base_id})] 보기 목록:`, infoLabels);
        }
    }, []);

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
    const [wizardTab, setWizardTab] = useState('scale'); // 'scale' | 'open-num'
    const [matrixSelection, setMatrixSelection] = useState({ top: [1, 2], mid: [], bot: [1, 2] });
    const [isMeanIncluded, setIsMeanIncluded] = useState(true);
    const [openStats, setOpenStats] = useState({ mean: true, median: false, mode: false });
    const [isMergeByTitle, setIsMergeByTitle] = useState(false);
    const [wizardSelectedIds, setWizardSelectedIds] = useState(new Set());
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [isSummarySidebarOpen, setIsSummarySidebarOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [summarySearchMap, setSummarySearchMap] = useState({ scale: '', 'open-num': '' });
    const [scalePresets, setScalePresets] = useState([]);
    const [colVars, setColVars] = useState([]);
    const [currentLabel, setCurrentLabel] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
    const [currentTab, setCurrentTab] = useState('scale'); // 'scale' (척도 문항) | 'open-num' (오픈(숫자) 문항)
    const [expandedParents, setExpandedParents] = useState(new Set());
    const hasInitializedExpanded = useRef(false);

    // --- 삭제 관리용 스테이트 추가 ---
    const [deletedSummaryIds, setDeletedSummaryIds] = useState([]); // 서버에 실제 삭제 요청할 ID들
    const [originalSummaryIds, setOriginalSummaryIds] = useState([]); // 초기 로딩된 요약표 ID 목록 (신규 구분용)
    const [originalFolderIds, setOriginalFolderIds] = useState([]); // 초기 로딩된 폴더 ID 목록 (신규 생성 구분용)
    const [collapsedFolders, setCollapsedFolders] = useState(new Set()); // 아코디언 상태 관리용
    const [dragOverTarget, setDragOverTarget] = useState({ folderId: null, idx: null }); // 드래그 오버 상태 관리

    // --- 일괄 편집 관련 상태 추가 ---
    const [expandedFolders, setExpandedFolders] = useState(new Set()); // 상세보기 활성화 폴더 ID
    const [isBulkTitleModalOpen, setIsBulkTitleModalOpen] = useState(false); // 제목 일괄 수정 모달 여부
    const [bulkTitleText, setBulkTitleText] = useState(''); // 제목 일괄 수정용 텍스트
    const [isBulkItemLabelModalOpen, setIsBulkItemLabelModalOpen] = useState(false); // 교차표 문구 일괄 수정 모달 여부
    const [activeBulkItemFolderId, setActiveBulkItemFolderId] = useState(null); // 활성화된 교차표 문구 일괄 편집 폴더
    const [bulkItemLabelText, setBulkItemLabelText] = useState(''); // 교차표 문구 일괄 편집용 텍스트
    const [modalFolders, setModalFolders] = useState([]); // 제목 일괄 수정 모달용 로컬 폴더 리스트

    // --- 수동 요약 생성 관련 상태 추가 ---
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualScaleMin, setManualScaleMin] = useState(1);
    const [manualScaleMax, setManualScaleMax] = useState(5);
    const [manualIsReverse, setManualIsReverse] = useState(false);
    const [manualBands, setManualBands] = useState([
        { id: 'b1', label: 'Bot2', values: '1,2' },
        { id: 'b2', label: 'Mid', values: '3' },
        { id: 'b3', label: 'Top2', values: '4,5' }
    ]);
    const [manualPresetId, setManualPresetId] = useState('custom');
    const [manualIsMeanIncluded, setManualIsMeanIncluded] = useState(true);

    const toggleFolderExpand = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    // 요약표 제목 일괄 수정 모달 열기
    const handleOpenBulkTitleModal = () => {
        const names = folders.map(f => f.name).join('\n');
        setBulkTitleText(names);
        setModalFolders(folders.map(f => ({ ...f })));
        setIsBulkTitleModalOpen(true);
    };

    // 좌측 대량 텍스트 변경 시 우측 폼 동기화
    const handleBulkTitleTextChange = (text) => {
        setBulkTitleText(text);
        const lines = text.split('\n');
        setModalFolders(prev => prev.map((f, idx) => ({
            ...f,
            name: lines[idx] !== undefined ? lines[idx] : ''
        })));
    };

    // 우측 개별 문항 변경 시 좌측 텍스트 동기화
    const handleIndividualTitleChange = (folderId, newName) => {
        setModalFolders(prev => {
            const updated = prev.map(f => f.id === folderId ? { ...f, name: newName } : f);
            const text = updated.map(f => f.name).join('\n');
            setBulkTitleText(text);
            return updated;
        });
    };

    // 요약표 제목 일괄 적용
    const handleApplyBulkTitleText = () => {
        setFolders(modalFolders);
        setIsBulkTitleModalOpen(false);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // 교차표 문구 일괄 편집 모달 열기
    const handleOpenBulkItemLabelModal = (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;
        const labels = folder.items.map(itemId => {
            const varInfo = summaries.find(s => s.id === itemId);
            return varInfo ? varInfo.label : itemId;
        }).join('\n');

        setActiveBulkItemFolderId(folderId);
        setBulkItemLabelText(labels);
        setIsBulkItemLabelModalOpen(true);
    };

    // 교차표 문구 일괄 적용
    const handleApplyBulkItemLabelText = () => {
        const folder = folders.find(f => f.id === activeBulkItemFolderId);
        if (!folder) return;
        const lines = bulkItemLabelText.split('\n').map(l => l.trim());

        setSummaries(prev => prev.map(s => {
            const idx = folder.items.indexOf(s.id);
            if (idx !== -1 && lines[idx] !== undefined && lines[idx] !== '') {
                return { ...s, label: lines[idx] };
            }
            return s;
        }));

        setIsBulkItemLabelModalOpen(false);
        setActiveBulkItemFolderId(null);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // 엑셀 붙여넣기 시 순서대로 자동 채움
    const handlePasteLabels = (e, startIdx, items) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('Text');
        const lines = clipboardData.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
        if (lines.length > 0) {
            setSummaries(prev => prev.map(s => {
                const itemIdx = items.indexOf(s.id);
                if (itemIdx !== -1 && itemIdx >= startIdx) {
                    const offset = itemIdx - startIdx;
                    if (lines[offset] !== undefined) {
                        return { ...s, label: lines[offset] };
                    }
                }
                return s;
            }));
            if (onUnsavedChange) onUnsavedChange(true);
        }
    };

    const scrollContainerRef = useRef(null);

    const filteredFolders = useMemo(() => {
        return folders.filter(folder => currentTab === 'scale' ? folder.type === 'frequency' : folder.type === 'statistics');
    }, [folders, currentTab]);

    useEffect(() => {
        if (isWizardOpen) {
            setWizardTab(currentTab);
        }
    }, [isWizardOpen, currentTab]);

    useEffect(() => {
        setWizardSelectedIds(new Set());
    }, [wizardTab]);

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
            // 척도 프리셋 데이터 조회 (1단계와 척도 정합성 일치용)
            try {
                const tableDetailResult = await getTableDetail.mutateAsync({ pageid: pageId, user: userId });
                const actualTableDetail = tableDetailResult?.resultjson || tableDetailResult;
                if (actualTableDetail?.scale_presets) {
                    setScalePresets(actualTableDetail.scale_presets);
                }
            } catch (err) {
                console.error("Failed to fetch scale presets in summary step:", err);
            }

            const result = await getSummaryDetail.mutateAsync({ pageid: pageId, user: userId });
            if (result?.success === '777' && result.resultjson) {
                if (result.resultjson.summary_source_variables) {
                    const sourceVars = result.resultjson.summary_source_variables;
                    setBaseVariables(Array.isArray(sourceVars) ? sourceVars : Object.values(sourceVars));
                }
                if (result.resultjson.summary_folders) {
                    const uniqueFolders = [];
                    const idSet = new Set();
                    result.resultjson.summary_folders.forEach(f => {
                        // 백엔드는 stub_id를 반환하므로 프론트엔드 id로 매핑
                        let fId = f.stub_id || f.id;
                        let counter = 1;
                        while (idSet.has(fId)) {
                            fId = `${f.stub_id || f.id}_dup${counter++}`;
                        }
                        idSet.add(fId);
                        uniqueFolders.push({ ...f, id: fId, name: f.label || f.name || fId });
                    });
                    setFolders(uniqueFolders);
                    setOriginalFolderIds(uniqueFolders.map(f => f.id));
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

            if (result && result.resultjson && result.resultjson.summary_folders) {
                // 응답에서 새로 생성된 폴더 목록이 summary_folders 또는 다른 형태로 온다면
                // 임시로 백엔드 스펙에 맞게 다시 조회하거나 매핑. 
                // 명세엔 generated_folder_count 등만 보여서, 여기선 fetchSummaryData 호출을 추천.
                await fetchSummaryData();
                if (onUnsavedChange) onUnsavedChange(true);
                modal.showAlert('알림', `${result.resultjson.generated_folder_count || result.resultjson.summary_folders?.length || 0}개의 척도형 요약표가 자동 생성되었습니다.`);
            } else if (result?.success === "777") {
                await fetchSummaryData();
                modal.showAlert('알림', `척도형 요약표 자동 생성이 완료되었습니다.`);
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

        const mappedFolders = [];
        (overrideFolders || folders).forEach(f => {
            const isScaleSummary = f.type === 'scale_summary' || f.type === 'statistics_summary';

            if (!isScaleSummary) {
                // 빈도형 요약표: Top2, Bot2, 평균 분할
                const firstItemId = f.items && f.items[0];
                const associatedVar = summaries.find(s => s.id === firstItemId);
                const sp = associatedVar?.scale_points || 7;

                const codes = f.include_codes || '';
                const hasTop2 = codes.includes(String(sp)) || codes.includes(String(sp - 1));
                const hasBot2 = codes.includes('1') || codes.includes('2');
                const hasMean = f.mean === true;

                let addedAny = false;

                if (hasTop2) {
                    mappedFolders.push({
                        stub_id: `${f.id}_top2`,
                        name: `${f.name} (Top2)`,
                        label: `${f.name} (Top2)`,
                        type: f.type,
                        items: f.items || [],
                        include_codes: [String(sp), String(sp - 1)].join(','),
                        mean: false,
                        median: false,
                        mode: false
                    });
                    addedAny = true;
                }

                if (hasBot2) {
                    mappedFolders.push({
                        stub_id: `${f.id}_bot2`,
                        name: `${f.name} (Bot2)`,
                        label: `${f.name} (Bot2)`,
                        type: f.type,
                        items: f.items || [],
                        include_codes: '1,2',
                        mean: false,
                        median: false,
                        mode: false
                    });
                    addedAny = true;
                }

                if (hasMean) {
                    mappedFolders.push({
                        stub_id: `${f.id}_mean`,
                        name: `${f.name} (평균)`,
                        label: `${f.name} (평균)`,
                        type: f.type,
                        items: f.items || [],
                        include_codes: '',
                        mean: true,
                        median: false,
                        mode: false
                    });
                    addedAny = true;
                }

                if (!addedAny) {
                    mappedFolders.push({
                        stub_id: f.id,
                        name: f.name,
                        label: f.name,
                        type: f.type,
                        items: f.items || [],
                        include_codes: typeof f.include_codes === 'string' ? f.include_codes.replace(/\s+/g, '') : f.include_codes,
                        mean: f.mean,
                        median: f.median,
                        mode: f.mode
                    });
                }
            } else {
                // 척도형(통계) 요약표: 평균, 중앙값, 최빈값 분할
                const hasMean = f.mean === true;
                const hasMedian = f.median === true;
                const hasMode = f.mode === true;

                let addedAny = false;

                if (hasMean) {
                    mappedFolders.push({
                        stub_id: `${f.id}_mean`,
                        name: `${f.name} (평균)`,
                        label: `${f.name} (평균)`,
                        type: f.type,
                        items: f.items || [],
                        include_codes: '',
                        mean: true,
                        median: false,
                        mode: false
                    });
                    addedAny = true;
                }

                if (hasMedian) {
                    mappedFolders.push({
                        stub_id: `${f.id}_median`,
                        name: `${f.name} (중앙값)`,
                        label: `${f.name} (중앙값)`,
                        type: f.type,
                        items: f.items || [],
                        include_codes: '',
                        mean: false,
                        median: true,
                        mode: false
                    });
                    addedAny = true;
                }

                if (hasMode) {
                    mappedFolders.push({
                        stub_id: `${f.id}_mode`,
                        name: `${f.name} (최빈값)`,
                        label: `${f.name} (최빈값)`,
                        type: f.type,
                        items: f.items || [],
                        include_codes: '',
                        mean: false,
                        median: false,
                        mode: true
                    });
                    addedAny = true;
                }

                if (!addedAny) {
                    mappedFolders.push({
                        stub_id: f.id,
                        name: f.name,
                        label: f.name,
                        type: f.type,
                        items: f.items || [],
                        include_codes: typeof f.include_codes === 'string' ? f.include_codes.replace(/\s+/g, '') : f.include_codes,
                        mean: f.mean,
                        median: f.median,
                        mode: f.mode
                    });
                }
            }
        });

        const payload = {
            pageid: pageId,
            user: auth?.user?.userId,
            summary_folders: mappedFolders,
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

    const tabFilteredVariables = useMemo(() => {
        return summaryVariables.filter(v => {
            const type = (v.type || '').toLowerCase();
            if (currentTab === 'scale') {
                return type === 'scale';
            } else {
                return type === 'double' || type === 'numeric' || type.includes('숫자') || type === 'open-num';
            }
        });
    }, [summaryVariables, currentTab]);

    const searchedVariables = useMemo(() => {
        const search = (summarySearchMap[currentTab] || '').toLowerCase().trim();
        if (!search) return tabFilteredVariables;
        return tabFilteredVariables.filter(v =>
            (v.label || '').toLowerCase().includes(search) || (v.id || '').toLowerCase().includes(search)
        );
    }, [tabFilteredVariables, summarySearchMap, currentTab]);

    const groupedVariables = useMemo(() => {
        const groups = {};
        searchedVariables.forEach(v => {
            const parentId = v.group_id;
            const parentLabel = v.group_label;

            if (!groups[parentId]) {
                groups[parentId] = {
                    parentId,
                    parentLabel,
                    type: v.type,
                    scalePoints: v.scale_points,
                    scalePresetId: v.scale_preset_id || null,
                    items: []
                };
            }
            groups[parentId].items.push(v);
        });
        return Object.values(groups);
    }, [searchedVariables]);

    // --- 요약표 일괄 자동 생성 마법사 비즈니스 로직 ---

    const applyWizardPreset = (preset) => {
        if (preset === 'top3_bot3') {
            setMatrixSelection({ top: [1, 2, 3], mid: [], bot: [1, 2, 3] });
            setIsMeanIncluded(true);
        } else if (preset === 'top2_bot2') {
            setMatrixSelection({ top: [1, 2], mid: [], bot: [1, 2] });
            setIsMeanIncluded(true);
        } else if (preset === 'top1_bot1') {
            setMatrixSelection({ top: [1], mid: [], bot: [1] });
            setIsMeanIncluded(true);
        } else if (preset === 'top_mid_bot') {
            setMatrixSelection({ top: [1], mid: [1], bot: [1] });
            setIsMeanIncluded(true);
        } else if (preset === 'all') {
            setMatrixSelection({ top: [1, 2, 3], mid: [1, 2, 3], bot: [1, 2, 3] });
            setIsMeanIncluded(true);
        } else if (preset === 'reset') {
            setMatrixSelection({ top: [], mid: [], bot: [] });
            setIsMeanIncluded(false);
        }
    };

    const isPresetActive = (key) => {
        const t = matrixSelection.top || [];
        const m = matrixSelection.mid || [];
        const b = matrixSelection.bot || [];
        const arrayEqual = (arr1, arr2) => {
            if (arr1.length !== arr2.length) return false;
            return arr1.every(val => arr2.includes(val));
        };
        if (key === 'top3_bot3') {
            return arrayEqual(t, [1, 2, 3]) && arrayEqual(m, []) && arrayEqual(b, [1, 2, 3]) && isMeanIncluded;
        }
        if (key === 'top2_bot2') {
            return arrayEqual(t, [1, 2]) && arrayEqual(m, []) && arrayEqual(b, [1, 2]) && isMeanIncluded;
        }
        if (key === 'top1_bot1') {
            return arrayEqual(t, [1]) && arrayEqual(m, []) && arrayEqual(b, [1]) && isMeanIncluded;
        }
        if (key === 'top_mid_bot') {
            return arrayEqual(t, [1]) && arrayEqual(m, [1]) && arrayEqual(b, [1]) && isMeanIncluded;
        }
        if (key === 'all') {
            return arrayEqual(t, [1, 2, 3]) && arrayEqual(m, [1, 2, 3]) && arrayEqual(b, [1, 2, 3]) && isMeanIncluded;
        }
        if (key === 'reset') {
            return arrayEqual(t, []) && arrayEqual(m, []) && arrayEqual(b, []) && !isMeanIncluded;
        }
        return false;
    };

    const toggleMatrixCell = (rowName, num) => {
        const row = rowName.toLowerCase();
        setMatrixSelection(prev => {
            const currentList = prev[row] || [];
            let nextList;
            if (currentList.includes(num)) {
                // 이미 포함되어 있으면, 해당 숫자 이상의 모든 숫자를 비활성화 (누적 해제)
                nextList = currentList.filter(x => x < num);
            } else {
                // 포함되어 있지 않으면, 1부터 해당 숫자까지 모두 활성화 (누적 선택)
                const needed = Array.from({ length: num }, (_, i) => i + 1);
                nextList = Array.from(new Set([...currentList, ...needed])).sort((a, b) => a - b);
            }
            return { ...prev, [row]: nextList };
        });
    };

    const setSelectionCount = (row, count) => {
        const nextList = count === 0 ? [] : Array.from({ length: count }, (_, i) => i + 1);
        setMatrixSelection(prev => ({ ...prev, [row]: nextList }));
    };

    const getPreviewChipStyle = (n, totalPoints) => {
        const topCount = (matrixSelection.top || []).length;
        const midCount = (matrixSelection.mid || []).length;
        const botCount = (matrixSelection.bot || []).length;

        const isTop = topCount > 0 && n >= (totalPoints - topCount + 1) && n <= totalPoints;
        const isBot = botCount > 0 && n >= 1 && n <= botCount;

        let isMid = false;
        if (midCount > 0) {
            const midIndexes = [];
            if (totalPoints % 2 === 1) {
                const center = Math.ceil(totalPoints / 2);
                if (midCount === 1) {
                    midIndexes.push(center);
                } else if (midCount === 2) {
                    midIndexes.push(center - 1, center);
                } else if (midCount === 3) {
                    midIndexes.push(center - 1, center, center + 1);
                }
            } else {
                const c1 = totalPoints / 2;
                const c2 = c1 + 1;
                if (midCount === 1) {
                    midIndexes.push(c1);
                } else if (midCount === 2) {
                    midIndexes.push(c1, c2);
                } else if (midCount === 3) {
                    midIndexes.push(c1 - 1, c1, c2);
                }
            }
            isMid = midIndexes.includes(n);
        }

        if (isTop) {
            return {
                bg: '#eff6ff',
                border: '#3b82f6',
                text: '#2563eb'
            };
        }
        if (isBot) {
            return {
                bg: '#ffe4e6',
                border: '#f43f5e',
                text: '#e11d48'
            };
        }
        if (isMid) {
            return {
                bg: '#fef3c7',
                border: '#f59e0b',
                text: '#d97706'
            };
        }

        return {
            bg: '#ffffff',
            border: '#cbd5e1',
            text: '#94a3b8'
        };
    };

    const toggleOpenStat = (key) => {
        setOpenStats(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const wizardProposals = useMemo(() => {
        const proposals = [];
        // 1. 척도형(Scale) 제안 리스트
        if (wizardTab === 'scale') {
            groupedVariables.forEach(group => {
                const type = (group.type || '').toLowerCase();
                if (type !== 'scale') return;

                const subItems = [];
                const tags = [];
                const sp = group.scalePoints || group.items[0]?.scale_points || 7;

                // 1단계 설정에서 해당 문항의 프리셋에 역코딩이 켜져 있는지 확인
                const preset = scalePresets.find(p => p.id === group.scalePresetId);
                const isReverse = preset?.options?.reverse || false;

                // Top 묶음 제안 (선택된 숫자들의 최댓값 기준 1개만 생성)
                if (Array.isArray(matrixSelection.top) && matrixSelection.top.length > 0) {
                    const maxTop = Math.max(...matrixSelection.top);
                    const sp = group.scalePoints || 7;
                    let codesArray;
                    if (isReverse) {
                        // 역채점 시 최고점은 1, 2...
                        codesArray = Array.from({ length: maxTop }, (_, i) => i + 1);
                    } else {
                        // 정방향 시 최고점은 sp, sp-1...
                        codesArray = Array.from({ length: maxTop }, (_, i) => sp - i);
                    }
                    const codes = codesArray.sort((a, b) => a - b).join(',');

                    subItems.push({
                        type: 'frequency',
                        name: `${group.parentLabel} - Top 요약 (${sp}점 척도)`,
                        include_codes: codes,
                        tag: `Top ${codes}`
                    });
                    tags.push(`Top ${codes}`);
                }

                // Mid 묶음 제안 (선택된 숫자들의 최댓값 기준 1개만 생성)
                if (Array.isArray(matrixSelection.mid) && matrixSelection.mid.length > 0) {
                    const maxMid = Math.max(...matrixSelection.mid);
                    const sp = group.scalePoints || 7;
                    const center = Math.ceil(sp / 2);
                    let codes = '';
                    if (maxMid === 1) codes = `${center}`;
                    else if (maxMid === 2) codes = `${center - 1},${center}`;
                    else codes = `${center - 1},${center},${center + 1}`;
                    subItems.push({
                        type: 'frequency',
                        name: `${group.parentLabel} - Mid 요약 (${sp}점 척도)`,
                        include_codes: codes,
                        tag: `Mid ${codes}`
                    });
                    tags.push(`Mid ${codes}`);
                }

                // Bot 묶음 제안 (선택된 숫자들의 최댓값 기준 1개만 생성)
                if (Array.isArray(matrixSelection.bot) && matrixSelection.bot.length > 0) {
                    const maxBot = Math.max(...matrixSelection.bot);
                    const sp = group.scalePoints || 7;
                    let codesArray;
                    if (isReverse) {
                        // 역채점 시 최하점은 sp, sp-1...
                        codesArray = Array.from({ length: maxBot }, (_, i) => sp - i);
                    } else {
                        // 정방향 시 최하점은 1, 2...
                        codesArray = Array.from({ length: maxBot }, (_, i) => i + 1);
                    }
                    const codes = codesArray.sort((a, b) => a - b).join(',');

                    subItems.push({
                        type: 'frequency',
                        name: `${group.parentLabel} - Bot 요약 (${sp}점 척도)`,
                        include_codes: codes,
                        tag: `Bot ${codes}`
                    });
                    tags.push(`Bot ${codes}`);
                }

                // 평균 요약 제안
                if (isMeanIncluded) {
                    const sp = group.scalePoints || 7;
                    subItems.push({
                        type: 'statistics',
                        name: `${group.parentLabel} - 평균 요약 (${sp}점 척도)`,
                        mean: true,
                        median: false,
                        mode: false,
                        tag: 'mean'
                    });
                    tags.push('평균');
                }

                if (subItems.length === 0) return;

                proposals.push({
                    id: `prop_scale_${group.parentId}`,
                    title: `${group.parentLabel} - 요약표`,
                    groupLabel: group.parentLabel,
                    groupId: group.parentId,
                    subItems,
                    tags,
                    items: group.items.map(it => it.id),
                    itemsDesc: `대상 문항: ${group.items.map(it => `${it.id}. ${it.label}`).join(', ')}`,
                    scale_points: sp
                });
            });
        }
        // 2. 오픈형(숫자) 제안 리스트
        else {
            groupedVariables.forEach(group => {
                const subItems = [];
                const tags = [];

                if (openStats.mean || openStats.median || openStats.mode) {
                    subItems.push({
                        type: 'statistics',
                        name: `${group.parentLabel} - 통계 요약표`,
                        mean: !!openStats.mean,
                        median: !!openStats.median,
                        mode: !!openStats.mode
                    });
                    if (openStats.mean) tags.push('평균');
                    if (openStats.median) tags.push('중앙값');
                    if (openStats.mode) tags.push('최빈값');
                }

                if (subItems.length === 0) return;

                proposals.push({
                    id: `prop_open_${group.parentId}`,
                    title: `${group.parentLabel} - 통계 요약표`,
                    groupLabel: group.parentLabel,
                    groupId: group.parentId,
                    subItems,
                    tags,
                    items: group.items.map(it => it.id),
                    itemsDesc: `대상 문항: ${group.items.map(it => `${it.id}. ${it.label}`).join(', ')}`
                });
            });
        }

        // 3. 동일 타이틀 합치기 처리 (합집합 연산)
        if (isMergeByTitle) {
            const mergedMap = {};
            proposals.forEach(prop => {
                const key = prop.title;
                if (!mergedMap[key]) {
                    mergedMap[key] = {
                        id: `merged_${key}`,
                        title: key,
                        groupLabel: prop.groupLabel,
                        groupId: prop.groupId,
                        subItems: [],
                        tags: new Set(),
                        items: new Set(),
                        scale_points: prop.scale_points
                    };
                }
                prop.subItems.forEach(si => {
                    const exists = mergedMap[key].subItems.find(x => x.name === si.name && x.include_codes === si.include_codes);
                    if (!exists) {
                        mergedMap[key].subItems.push(si);
                    }
                });
                prop.tags.forEach(t => mergedMap[key].tags.add(t));
                prop.items.forEach(itm => mergedMap[key].items.add(itm));
            });

            return Object.values(mergedMap).map(m => ({
                id: m.id,
                title: m.title,
                groupLabel: m.groupLabel,
                groupId: m.groupId,
                subItems: m.subItems,
                tags: Array.from(m.tags),
                items: Array.from(m.items),
                itemsDesc: `대상 문항: ${Array.from(m.items).join(', ')}`,
                scale_points: m.scale_points
            }));
        }

        return proposals;
    }, [wizardTab, matrixSelection, isMeanIncluded, openStats, isMergeByTitle, groupedVariables, scalePresets]);

    // --- 수동 요약 생성 팝업 핸들러 및 비즈니스 로직 ---

    const handleOpenManualSummaryModal = () => {
        if (selectedIds.length === 0) return;

        // 척도 정합성 일치 검사 (동일한 척도로만 생성 가능하도록 제한)
        const scalePointsSet = new Set();
        selectedIds.forEach(id => {
            const v = summaryVariables.find(item => item.id === id);
            if (v && v.scale_points !== undefined && v.scale_points !== null) {
                scalePointsSet.add(v.scale_points);
            }
        });
        if (scalePointsSet.size > 1) {
            modal.showAlert('알림', '동일한 척도의 변수로만 요약표를 생성할 수 있습니다.');
            return;
        }

        // 선택된 문항들의 scale_points 중 최댓값을 가져와 척도 점수로 셋팅
        let maxSp = 5;
        selectedIds.forEach(id => {
            const v = summaryVariables.find(item => item.id === id);
            if (v && v.scale_points) {
                maxSp = Math.max(maxSp, v.scale_points);
            }
        });

        setManualScaleMax(maxSp);
        setManualScaleMin(1);
        
        // 탭이 오픈 문항 탭인 경우
        if (currentTab === 'open-num') {
            setIsManualModalOpen(true);
            return;
        }

        // 선택한 점수에 맞는 프리셋이 있는지 확인해서 있으면 프리셋 자동 선택, 없으면 custom
        const matchedPreset = scalePresets.find(p => (p.options?.max || p.max) === maxSp);
        if (matchedPreset) {
            setManualPresetId(matchedPreset.id);
            const opts = matchedPreset.options || {};
            setManualIsReverse(!!opts.reverse);
            let loadedBands = [];
            if (Array.isArray(opts.bands)) {
                loadedBands = opts.bands.map((b, idx) => ({
                    id: b.id || `band_${idx}_${Date.now()}`,
                    label: b.label || 'Top',
                    values: Array.isArray(b.values) ? b.values.join(',') : ''
                }));
            } else if (Array.isArray(matchedPreset.bands)) {
                loadedBands = matchedPreset.bands.map((b, idx) => ({
                    id: b.id || `band_${idx}_${Date.now()}`,
                    label: b.label || 'Top',
                    values: String(b.values)
                }));
            }
            if (loadedBands.length > 0) {
                setManualBands(loadedBands);
            } else {
                setDefaultBandsForScale(maxSp);
            }
        } else {
            setManualPresetId('custom');
            setDefaultBandsForScale(maxSp);
        }

        setIsManualModalOpen(true);
    };

    const setDefaultBandsForScale = (sp) => {
        if (sp === 5) {
            setManualBands([
                { id: 'b1', label: 'Bot2', values: '1,2' },
                { id: 'b2', label: 'Mid', values: '3' },
                { id: 'b3', label: 'Top2', values: '4,5' }
            ]);
        } else if (sp === 7) {
            setManualBands([
                { id: 'b1', label: 'Bot3', values: '1,2,3' },
                { id: 'b2', label: 'Mid', values: '4' },
                { id: 'b3', label: 'Top3', values: '5,6,7' }
            ]);
        } else {
            const center = Math.ceil(sp / 2);
            const botVals = Array.from({ length: center - 1 }, (_, i) => i + 1).join(',');
            const topVals = Array.from({ length: sp - center }, (_, i) => center + 1 + i).join(',');
            setManualBands([
                { id: 'b1', label: 'Bot', values: botVals },
                { id: 'b2', label: 'Mid', values: `${center}` },
                { id: 'b3', label: 'Top', values: topVals }
            ]);
        }
    };

    const handleManualPresetChange = (presetId) => {
        setManualPresetId(presetId);
        if (presetId === 'custom') return;

        const preset = scalePresets.find(p => p.id === presetId);
        if (preset) {
            const opts = preset.options || {};
            setManualScaleMin(opts.min ?? 1);
            setManualScaleMax(opts.max ?? 5);
            setManualIsReverse(!!opts.reverse);
            
            let loadedBands = [];
            if (Array.isArray(opts.bands)) {
                loadedBands = opts.bands.map((b, idx) => ({
                    id: b.id || `band_${idx}_${Date.now()}`,
                    label: b.label || 'Top',
                    values: Array.isArray(b.values) ? b.values.join(',') : ''
                }));
            } else if (Array.isArray(preset.bands)) {
                loadedBands = preset.bands.map((b, idx) => ({
                    id: b.id || `band_${idx}_${Date.now()}`,
                    label: b.label || 'Top',
                    values: String(b.values)
                }));
            }
            setManualBands(loadedBands);
        }
    };

    const getBandValueCount = (valStr) => {
        if (!valStr) return 0;
        return valStr.split(',').map(s => s.trim()).filter(s => s !== '' && !isNaN(Number(s))).length;
    };

    const handleToggleCircle = (bandId, num) => {
        setManualBands(prev => prev.map(band => {
            if (band.id !== bandId) return band;

            let currentVals = band.values.split(',')
                .map(s => s.trim())
                .filter(s => s !== '')
                .map(Number)
                .filter(n => !isNaN(n));

            if (currentVals.includes(num)) {
                currentVals = currentVals.filter(v => v !== num);
            } else {
                currentVals = [...currentVals, num].sort((a, b) => a - b);
            }

            return {
                ...band,
                values: currentVals.join(',')
            };
        }));
    };

    const handleAddManualBand = () => {
        setManualBands(prev => [
            ...prev,
            { id: `band_${Date.now()}_${Math.random()}`, label: 'Top', values: '' }
        ]);
    };

    const handleRemoveManualBand = (bandId) => {
        setManualBands(prev => prev.filter(b => b.id !== bandId));
    };

    const handleConfirmManualSummary = () => {
        if (selectedIds.length === 0) {
            modal.showAlert('알림', '선택된 변수가 없습니다.');
            return;
        }

        // 척도 일치 여부 검사 (다른 척도 혼용 방지)
        const scalePointsSet = new Set();
        selectedIds.forEach(varId => {
            const baseVar = summaryVariables.find(v => v.id === varId);
            if (baseVar && baseVar.scale_points !== undefined && baseVar.scale_points !== null) {
                scalePointsSet.add(baseVar.scale_points);
            }
        });
        if (scalePointsSet.size > 1) {
            modal.showAlert('알림', '동일한 척도의 변수로만 요약표를 동시에 생성할 수 있습니다.');
            return;
        }

        const newSummaries = [];
        const uniqueFolders = [...folders];

        if (currentTab === 'scale') {
            // 밴드 값 입력 유효성 검사
            for (let i = 0; i < manualBands.length; i++) {
                const band = manualBands[i];
                if (getBandValueCount(band.values) === 0) {
                    modal.showAlert('알림', `'${band.label}' 밴드에 지정된 값이 없습니다. 값을 기입하거나 삭제해 주세요.`);
                    return;
                }
            }

            // 선택된 변수별로 폴더 및 summaries 상세 구조 생성
            selectedIds.forEach((varId) => {
                const baseVar = baseVariables.find(v => v.id === varId);
                const varLabel = baseVar?.label || baseVar?.name || varId;
                const sp = baseVar?.scale_points || manualScaleMax;

                const subItems = [];
                manualBands.forEach(band => {
                    subItems.push({
                        type: 'frequency',
                        name: `${varLabel} - ${band.label} 요약`,
                        include_codes: band.values,
                        tag: band.label
                    });
                });

                if (manualIsMeanIncluded) {
                    subItems.push({
                        type: 'statistics',
                        name: `${varLabel} - 평균 요약 (${sp}점 척도)`,
                        mean: true,
                        median: false,
                        mode: false,
                        tag: 'mean'
                    });
                }

                const folderId = `manual_scale_${varId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newFolder = {
                    id: folderId,
                    name: `${varLabel} - 요약표`,
                    label: `${varLabel} - 요약표`,
                    type: 'frequency',
                    scale_points: sp,
                    scale_preset_id: manualPresetId !== 'custom' ? manualPresetId : null,
                    items: [varId]
                };
                uniqueFolders.push(newFolder);

                const formatted = {
                    id: folderId,
                    label: `${varLabel} - 요약표`,
                    subId: folderId,
                    info: subItems.map(si => ({ ...si, inEdit: false }))
                };
                newSummaries.push(formatted);
            });
        } else {
            // 오픈형 생성
            const hasAnyStats = openStats.mean || openStats.median || openStats.mode;
            if (!hasAnyStats) {
                modal.showAlert('알림', '최소 하나 이상의 통계 옵션(평균/중앙값/최빈값)을 선택해 주세요.');
                return;
            }

            selectedIds.forEach((varId) => {
                const baseVar = baseVariables.find(v => v.id === varId);
                const varLabel = baseVar?.label || baseVar?.name || varId;

                const subItems = [];
                subItems.push({
                    type: 'statistics',
                    name: `${varLabel} - 통계 요약표`,
                    mean: !!openStats.mean,
                    median: !!openStats.median,
                    mode: !!openStats.mode
                });

                const folderId = `manual_open_${varId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newFolder = {
                    id: folderId,
                    name: `${varLabel} - 통계 요약표`,
                    label: `${varLabel} - 통계 요약표`,
                    type: 'statistics',
                    items: [varId]
                };
                uniqueFolders.push(newFolder);

                const formatted = {
                    id: folderId,
                    label: `${varLabel} - 통계 요약표`,
                    subId: folderId,
                    info: subItems.map(si => ({ ...si, inEdit: false }))
                };
                newSummaries.push(formatted);
            });
        }

        setFolders(uniqueFolders);
        setSummaries(prev => [...prev, ...newSummaries]);
        setSelectedSummary(newSummaries[0]?.id || null);

        // 히스토리 업데이트 연동
        if (history && typeof history.commit === 'function') {
            history.commit({
                folders: uniqueFolders,
                summaries: [...summaries, ...newSummaries]
            });
        }

        setIsManualModalOpen(false);
        setSelectedIds([]);
        modal.showAlert('성공', '선택된 변수로 요약표가 성공적으로 생성되었습니다.');
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // 전체 선택/해제 핸들러
    const handleToggleAllWizardProposals = (select) => {
        if (select) {
            setWizardSelectedIds(new Set(wizardProposals.map(p => p.id)));
        } else {
            setWizardSelectedIds(new Set());
        }
    };

    const toggleWizardProposalSelect = (id) => {
        setWizardSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAddProposals = () => {
        const selectedProposals = wizardProposals.filter(p => wizardSelectedIds.has(p.id));
        if (selectedProposals.length === 0) {
            modal.showAlert('알림', '선택된 요약표 생성 제안이 없습니다.');
            return;
        }

        const newFoldersToAdd = [];
        selectedProposals.forEach(prop => {
            prop.subItems.forEach((sub, subIdx) => {
                const folderId = `folder_auto_${Date.now()}_${prop.groupId}_${sub.tag || subIdx}_${Math.random().toString(36).substr(2, 5)}`;

                newFoldersToAdd.push({
                    id: folderId,
                    name: sub.name,
                    type: sub.type,
                    include_codes: sub.include_codes || '',
                    mean: sub.mean || false,
                    median: sub.median || false,
                    mode: sub.mode || false,
                    items: [...prop.items]
                });
            });
        });

        setFolders(prev => [...prev, ...newFoldersToAdd]);
        setIsWizardOpen(false);
        if (onUnsavedChange) onUnsavedChange(true);

        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    // 탭이나 groupedVariables가 변경될 때 아코디언 폴더들을 기본적으로 모두 열어둠
    useEffect(() => {
        if (groupedVariables.length > 0) {
            setExpandedParents(new Set(groupedVariables.map(g => g.parentId)));
        }
    }, [groupedVariables, currentTab]);

    const toggleParentExpand = useCallback((parentId) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else next.add(parentId);
            return next;
        });
    }, []);

    const handleParentCheckboxClick = useCallback((e, group) => {
        e.stopPropagation();
        const childIds = group.items.map(item => item.id);
        const allSelected = childIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !childIds.includes(id)));
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                childIds.forEach(id => next.add(id));
                return Array.from(next);
            });
        }
    }, [selectedIds]);

    const handleChildClick = useCallback((e, id) => {
        e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const handleParentDragStart = useCallback((e, group) => {
        const targets = group.items;
        setSelectedIds(group.items.map(it => it.id));
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'EXTERNAL', items: targets }));
    }, []);

    const handleChildDragStart = useCallback((e, variable) => {
        let targets = [];
        if (selectedIds.includes(variable.id)) {
            targets = summaryVariables.filter(v => selectedIds.includes(v.id));
        } else {
            targets = [variable];
            setSelectedIds([variable.id]);
        }
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'EXTERNAL', items: targets }));
    }, [selectedIds, summaryVariables]);

    // 요약표 목록 필터링 (일단 유지)
    const filteredSummaries = useMemo(() => {
        const search = (summarySearchMap[currentTab] || '').toLowerCase();
        return summaries.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [summaries, summarySearchMap, currentTab]);

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
        <div className="dp-request-container" onClick={() => updateSummaryInfo(summaries.find(b => b.id === selectedSummary)?.info.map(it => ({ ...it, inEdit: false })) || [])} style={{ background: '#f8fafc', gap: 0, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
            {/* 큰 대분류 탭 바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#FFFFFF', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div
                        onClick={() => setCurrentTab('scale')}
                        style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            fontWeight: currentTab === 'scale' ? 600 : 500,
                            fontSize: '15px',
                            color: currentTab === 'scale' ? '#2563eb' : '#64748B',
                            borderBottom: currentTab === 'scale' ? '3px solid #2563eb' : '3px solid transparent',
                            marginBottom: '-1px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            userSelect: 'none'
                        }}
                    >
                        척도 문항
                    </div>
                    <div
                        onClick={() => setCurrentTab('open-num')}
                        style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            fontWeight: currentTab === 'open-num' ? 600 : 500,
                            fontSize: '15px',
                            color: currentTab === 'open-num' ? '#2563eb' : '#64748B',
                            borderBottom: currentTab === 'open-num' ? '3px solid #2563eb' : '3px solid transparent',
                            marginBottom: '-1px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            userSelect: 'none'
                        }}
                    >
                        오픈(숫자) 문항
                    </div>
                </div>

                {/* 요약표 자동생성 버튼을 탭 영역 우측에 배치 */}
                <button
                    onClick={() => setIsWizardOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px',
                        background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px',
                        padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                    <Wand2 size={14} />
                    <span>요약표 자동생성</span>
                </button>
            </div>

            {/* 2. 메인 레이아웃 */}
            <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', margin: '16px 16px 16px 16px' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>원본 변수 목록 ({tabFilteredVariables.length})</span>
                                {selectedIds.length > 0 && (
                                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', height: '18px' }}>
                                        선택 {selectedIds.length}
                                    </span>
                                )}
                            </div>
                            <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsSummarySidebarOpen(false)}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>

                        {/* 2. 검색창 */}
                        <div style={{ padding: '12px 12px 6px 12px', flexShrink: 0 }}>
                            <div className="dp-search-input-wrapper" style={{ width: '100%', marginBottom: '0' }}>
                                <Search size={14} className="dp-search-input-icon" />
                                <input
                                    type="text"
                                    placeholder="변수 ID 또는 라벨 검색..."
                                    value={summarySearchMap[currentTab] || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSummarySearchMap(prev => ({ ...prev, [currentTab]: val }));
                                    }}
                                    className="dp-search-input"
                                />
                            </div>
                        </div>

                        <div style={{ borderBottom: '1px solid #e2e8f0', flexShrink: 0, margin: '0 12px 0px 12px' }} />

                        {/* 4. 아코디언 트리형 변수 목록 */}
                        <div className="dp-summary-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px' }}>
                            {groupedVariables.map((group) => {
                                const isExpanded = expandedParents.has(group.parentId);
                                const childIds = group.items.map(item => item.id);
                                const isAllSelected = childIds.every(id => selectedIds.includes(id));
                                const isSomeSelected = childIds.some(id => selectedIds.includes(id)) && !isAllSelected;

                                return (
                                    <div key={group.parentId} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '4px', overflow: 'hidden', background: '#f8fafc' }}>
                                        {/* 부모 폴더 헤더 */}
                                        <div
                                            draggable
                                            onDragStart={(e) => handleParentDragStart(e, group)}
                                            onClick={() => toggleParentExpand(group.parentId)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                ref={el => {
                                                    if (el) el.indeterminate = isSomeSelected;
                                                }}
                                                onChange={(e) => handleParentCheckboxClick(e, group)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px', flexShrink: 0, appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                                            />
                                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {group.parentLabel}
                                            </span>
                                            <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
                                                {group.parentId}
                                            </span>
                                        </div>

                                        {/* 자식 문항 리스트 */}
                                        {isExpanded && (
                                            <div style={{ background: '#ffffff' }}>
                                                {group.items.map((variable) => {
                                                    const isSelected = selectedIds.includes(variable.id);
                                                    return (
                                                        <div
                                                            key={variable.id}
                                                            draggable
                                                            onDragStart={(e) => handleChildDragStart(e, variable)}
                                                            onClick={(e) => handleChildClick(e, variable.id)}
                                                            onMouseUp={() => handleVariableMouseUp(variable)}
                                                            title={getVariableTooltip(variable)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '5px 8px 5px 22px',
                                                                borderBottom: '1px solid #f1f5f9',
                                                                cursor: 'grab',
                                                                background: isSelected ? '#eff6ff' : '#ffffff',
                                                                transition: 'background-color 0.15s'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => handleChildClick(e, variable.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{ cursor: 'pointer', margin: 0, width: '12px', height: '12px', flexShrink: 0, appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                                                            />
                                                            <span style={{ fontSize: '11.5px', color: '#1e293b', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {variable.label}
                                                            </span>
                                                            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500, marginRight: '8px' }}>
                                                                {variable.id}
                                                            </span>
                                                            {currentTab === 'scale' && variable.scale_points && (
                                                                <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 4px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                                                    {variable.scale_points}점
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 요약표 수동 생성 버튼 영역 */}
                        <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0 }}>
                            <button
                                disabled={selectedIds.length === 0}
                                onClick={handleOpenManualSummaryModal}
                                style={{
                                    width: '100%',
                                    height: '36px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: selectedIds.length > 0 ? '#2563eb' : '#cbd5e1',
                                    color: '#ffffff',
                                    cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    boxShadow: selectedIds.length > 0 ? '0 2px 4px rgba(37, 99, 235, 0.15)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedIds.length > 0) e.currentTarget.style.background = '#1d4ed8';
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedIds.length > 0) e.currentTarget.style.background = '#2563eb';
                                }}
                            >
                                <Plus size={14} />
                                <span>요약표 생성 ({selectedIds.length}개 선택됨)</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div ref={scrollContainerRef} className="dp-table-container custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '16px' }}>
                        {/* 생성된 요약표 목록 헤더 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                생성된 요약표 목록 ({folders.length}개)
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleOpenBulkTitleModal}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 12px',
                                        fontSize: '12px', fontWeight: 600, background: '#ffffff', color: '#475569',
                                        border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                >
                                    <Edit size={13} />
                                    <span>제목 일괄 수정</span>
                                </button>
                                <button
                                    onClick={() => {
                                        modal.showConfirm('전체 삭제 확인', '생성된 모든 요약표를 삭제하시겠습니까?', {
                                            btns: [
                                                { title: "취소", click: () => { } },
                                                {
                                                    title: "모두 삭제",
                                                    click: async () => {
                                                        const newDeletedIds = [...new Set([...deletedSummaryIds, ...originalFolderIds])];
                                                        setDeletedSummaryIds(newDeletedIds);
                                                        setFolders([]);
                                                        await handleSaveSummary([], newDeletedIds, '모든 요약표가 삭제되었습니다.');
                                                    }
                                                }
                                            ]
                                        });
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 12px',
                                        fontSize: '12px', fontWeight: 600, background: '#ffffff', color: '#ef4444',
                                        border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                >
                                    <Trash2 size={13} />
                                    <span>모두 삭제</span>
                                </button>
                            </div>
                        </div>

                        {filteredFolders.map((folder, folderIdx) => {
                            const isExpanded = expandedFolders.has(folder.id);

                            const scalePoints = summaries.find(s => folder.items.includes(s.id))?.scale_points || 7;
                            const isStatistics = folder.type === 'statistics';

                            const badgeList = [];
                            if (isStatistics) {
                                if (folder.mean) badgeList.push('평균');
                                if (folder.median) badgeList.push('중앙값');
                                if (folder.mode) badgeList.push('최빈값');
                            } else {
                                const codes = folder.include_codes || '';
                                const hasTopCodes = codes.includes(String(scalePoints)) || codes.includes(String(scalePoints - 1));
                                const hasBotCodes = codes.includes('1') || codes.includes('2');
                                if (hasTopCodes) badgeList.push(`Top2`);
                                if (hasBotCodes) badgeList.push(`Bot2`);
                                if (folder.mean) badgeList.push('평균');
                            }

                            return (
                                <div key={folder.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', padding: '12px', display: 'flex', flexDirection: 'column' }}>

                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <div style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: '#94a3b8', marginRight: '6px' }}>
                                            <GripVertical size={16} />
                                        </div>

                                        <div 
                                            style={{ flex: 1, minWidth: 0, marginRight: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                                            onClick={() => toggleFolderExpand(folder.id)}
                                        >

                                                 {isExpanded ? (
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                                         <input
                                                             type="text"
                                                             value={folder.name}
                                                             onChange={(e) => {
                                                                 setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: e.target.value } : f));
                                                                 if (onUnsavedChange) onUnsavedChange(true);
                                                             }}
                                                             onKeyDown={(e) => {
                                                                 if (e.key === 'Enter') {
                                                                     e.target.blur();
                                                                 }
                                                             }}
                                                             onClick={(e) => e.stopPropagation()}
                                                             onMouseDown={(e) => e.stopPropagation()}
                                                             onMouseUp={(e) => e.stopPropagation()}
                                                             style={{
                                                                 fontSize: '13px',
                                                                 fontWeight: 700,
                                                                 color: '#1e293b',
                                                                 border: '1px solid #cbd5e1',
                                                                 borderRadius: '4px',
                                                                 padding: '2px 6px',
                                                                 outline: 'none',
                                                                 background: '#ffffff',
                                                                 width: '280px'
                                                             }}
                                                         />
                                                         <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                                                             ({folder.id})
                                                         </span>
                                                     </div>
                                                 ) : (
                                                     <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                                         {folder.name}
                                                         <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600, marginLeft: '6px' }}>
                                                             ({folder.id})
                                                         </span>
                                                     </span>
                                                 )}
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                     <span style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                                         {folder.items?.length || 0}개
                                                     </span>
                                                     {badgeList.length > 0 && (
                                                         <div style={{ display: 'flex', gap: '4px' }}>
                                                             {badgeList.map(b => {
                                                                 let bg = '#f1f5f9';
                                                                 let fg = '#64748b';
                                                                 if (b.includes('Top')) { bg = '#ecfdf5'; fg = '#10b981'; }
                                                                 else if (b.includes('Bot')) { bg = '#fff1f2'; fg = '#f43f5e'; }
                                                                 else if (b === '평균') { bg = '#eff6ff'; fg = '#3b82f6'; }
                                                                 return (
                                                                     <span key={b} style={{ fontSize: '9px', fontWeight: 700, color: fg, background: bg, padding: '1px 5px', borderRadius: '3px' }}>
                                                                         {b}
                                                                     </span>
                                                                 );
                                                             })}
                                                         </div>
                                                     )}
                                                 </div>
                                         </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingFolderId(folder.id);
                                                    setEditingTitleText(folder.name);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                                    background: 'transparent', color: '#64748b', border: 'none', borderRadius: '6px',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#f1f5f9';
                                                    e.currentTarget.style.color = '#1e293b';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = '#64748b';
                                                }}
                                                title="이름 수정"
                                            >
                                                <Edit size={14} />
                                            </button>

                                            <button
                                                onClick={() => {
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
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                                    background: 'transparent', color: '#10b981', border: 'none', borderRadius: '6px',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#ecfdf5';
                                                    e.currentTarget.style.color = '#059669';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = '#10b981';
                                                }}
                                                title="복사"
                                            >
                                                <Copy size={14} />
                                            </button>

                                            <button
                                                onClick={() => {
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
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                                    background: 'transparent', color: '#ef4444', border: 'none', borderRadius: '6px',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#fff1f2';
                                                    e.currentTarget.style.color = '#dc2626';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = '#ef4444';
                                                }}
                                                title="삭제"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>

                                            <div style={{ display: 'none', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>요약표 타이틀명:</span>
                                                <input
                                                    id={`folder-name-input-${folder.id}`}
                                                    type="text"
                                                    value={folder.name}
                                                    onChange={(e) => {
                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: e.target.value } : f));
                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                    }}
                                                    style={{ flex: 1, padding: '5px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', background: '#ffffff', color: '#1e293b' }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '0 4px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>포함 요약표 구성 (뱃지):</span>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    {!isStatistics ? (
                                                        <>
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '11.5px', fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="dp-checkbox-input"
                                                                    checked={(folder.include_codes || '').includes(String(scalePoints)) || (folder.include_codes || '').includes(String(scalePoints - 1))}
                                                                    onChange={(e) => {
                                                                        let newCodes = (folder.include_codes || '').split(',').map(x => x.trim()).filter(Boolean);
                                                                        const topCodes = [String(scalePoints), String(scalePoints - 1)];
                                                                        if (e.target.checked) {
                                                                            topCodes.forEach(tc => { if (!newCodes.includes(tc)) newCodes.push(tc); });
                                                                        } else {
                                                                            newCodes = newCodes.filter(c => !topCodes.includes(c));
                                                                        }
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, include_codes: newCodes.join(',') } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                />
                                                                <span className="dp-checkbox-box"></span>
                                                                <span>Top2</span>
                                                            </label>
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '11.5px', fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="dp-checkbox-input"
                                                                    checked={(folder.include_codes || '').includes('1') || (folder.include_codes || '').includes('2')}
                                                                    onChange={(e) => {
                                                                        let newCodes = (folder.include_codes || '').split(',').map(x => x.trim()).filter(Boolean);
                                                                        const botCodes = ['1', '2'];
                                                                        if (e.target.checked) {
                                                                            botCodes.forEach(bc => { if (!newCodes.includes(bc)) newCodes.push(bc); });
                                                                        } else {
                                                                            newCodes = newCodes.filter(c => !botCodes.includes(c));
                                                                        }
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, include_codes: newCodes.join(',') } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                />
                                                                <span className="dp-checkbox-box"></span>
                                                                <span>Bot2</span>
                                                            </label>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '11.5px', fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="dp-checkbox-input"
                                                                    checked={folder.mean || false}
                                                                    onChange={(e) => {
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mean: e.target.checked } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                />
                                                                <span className="dp-checkbox-box"></span>
                                                                <span>평균</span>
                                                            </label>
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '11.5px', fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="dp-checkbox-input"
                                                                    checked={folder.median || false}
                                                                    onChange={(e) => {
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, median: e.target.checked } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                />
                                                                <span className="dp-checkbox-box"></span>
                                                                <span>중앙값</span>
                                                            </label>
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '11.5px', fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="dp-checkbox-input"
                                                                    checked={folder.mode || false}
                                                                    onChange={(e) => {
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mode: e.target.checked } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                />
                                                                <span className="dp-checkbox-box"></span>
                                                                <span>최빈값</span>
                                                            </label>
                                                        </>
                                                    )}
                                                    {!isStatistics && (
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '11.5px', fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                                                            <input
                                                                type="checkbox"
                                                                className="dp-checkbox-input"
                                                                checked={folder.mean || false}
                                                                onChange={(e) => {
                                                                    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mean: e.target.checked } : f));
                                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                                }}
                                                            />
                                                            <span className="dp-checkbox-box"></span>
                                                            <span>평균</span>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>상세 변수 및 교차표 문구 매핑</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                                        💡 엑셀의 열을 복사하여 아래 입력창에 붙여넣으면 순서대로 자동 채움 처리됩니다.
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenBulkItemLabelModal(folder.id)}
                                                        style={{
                                                            height: '26px', padding: '0 10px', fontSize: '11px', fontWeight: 600,
                                                            background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                            cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                                    >
                                                        전체 일괄 편집
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                                                            <th style={{ padding: '8px 12px', textAlign: 'left', width: '180px' }}>변수 ID</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>교차표 문구 (더블클릭/붙여넣기 지원)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {folder.items.map((itemId, idx) => {
                                                            const varInfo = summaries.find(s => s.id === itemId);
                                                            const labelValue = varInfo ? varInfo.label : '';
                                                            return (
                                                                <tr key={itemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                    <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, fontFamily: 'monospace' }}>
                                                                        {itemId}
                                                                    </td>
                                                                    <td style={{ padding: '6px 12px' }}>
                                                                        <input
                                                                            type="text"
                                                                            value={labelValue}
                                                                            onChange={(e) => {
                                                                                setSummaries(prev => prev.map(s => s.id === itemId ? { ...s, label: e.target.value } : s));
                                                                                if (onUnsavedChange) onUnsavedChange(true);
                                                                            }}
                                                                            onPaste={(e) => handlePasteLabels(e, idx, folder.items)}
                                                                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none', color: '#1e293b' }}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                        </div>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 요약표 일괄 자동 생성 마법사 모달 */}
            {isWizardOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '12px', width: '700px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.15)', overflow: 'hidden'
                    }}>
                        {/* 팝업 헤더 */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 18px', borderBottom: '1px solid #e2e8f0', background: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                                <span style={{ width: '3px', height: '14px', backgroundColor: '#2563eb', marginRight: '8px', display: 'inline-block' }}></span>
                                <span>요약표 일괄 자동 생성</span>
                            </div>
                            <button
                                onClick={() => setIsWizardOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={18} />
                            </button>
                        </div>



                        {/* 모달 콘텐츠 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
                            {/* 안내 배너 */}
                            <div style={{
                                display: 'flex', gap: '6px', padding: '4px 10px', borderRadius: '4px',
                                background: '#f0f9ff', border: '1px solid #e0f2fe', color: '#0369a1', fontSize: '11px', lineHeight: 1.4
                            }}>
                                <span style={{ fontSize: '13px', display: 'inline-block', transform: 'translateY(-1px)' }}>💡</span>
                                <span style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 500 }}>
                                    {wizardTab === 'scale'
                                        ? '감지된 모든 척도형 문항(Scale) 묶음에 대해 지정한 밴드 조합과 평균 포함 여부에 따라 요약표를 일괄 구성합니다.'
                                        : '오픈/숫자형(open(숫자)) 문항들에 대해 선택한 통계 요약표를 일괄적으로 구성하여 생성 제안합니다.'
                                    }
                                </span>
                            </div>

                            {/* 옵션 설정 영역 */}
                            {wizardTab === 'scale' ? (
                                    <>
                                        {/* 척도형 옵션 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                                    요약 유형 설정 <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>(문항별 척도 기준 자동 변환)</span>
                                                </div>
                                            </div>

                                            {/* 빠른 선택 및 평균 포함 배치 */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>빠른 선택:</span>
                                                    {[
                                                        { key: 'top3_bot3', label: 'Top3-Bot3' },
                                                        { key: 'top2_bot2', label: 'Top2-Bot2' },
                                                        { key: 'top1_bot1', label: 'Top1-Bot1' },
                                                        { key: 'top_mid_bot', label: 'Top-Mid-Bot' },
                                                        { key: 'reset', label: '초기화' }
                                                    ].map(preset => {
                                                        const isActive = isPresetActive(preset.key);
                                                        let borderStyle = '1px solid #cbd5e1';
                                                        let bgStyle = '#ffffff';
                                                        let colorStyle = '#475569';
                                                        if (preset.key === 'reset') {
                                                            borderStyle = '1px solid #cbd5e1';
                                                            bgStyle = '#f8fafc';
                                                        }
                                                        if (isActive) {
                                                            borderStyle = '1px solid #2563eb';
                                                            bgStyle = '#eff6ff';
                                                            colorStyle = '#2563eb';
                                                        }
                                                        return (
                                                            <button
                                                                key={preset.key}
                                                                onClick={() => applyWizardPreset(preset.key)}
                                                                style={{
                                                                    padding: '4px 10px', fontSize: '11px', borderRadius: '16px',
                                                                    border: borderStyle,
                                                                    background: bgStyle,
                                                                    color: colorStyle, fontWeight: isActive ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                                }}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* 평균 포함 체크박스 제안 배치 */}
                                                <label
                                                    className="dp-checkbox-label"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={isMeanIncluded}
                                                        onChange={(e) => setIsMeanIncluded(e.target.checked)}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>평균 포함</span>
                                                </label>
                                            </div>

                                            {/* 개수 선택 라인 */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                {/* Top 선택 */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }} />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>Top</span>
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>가장 높은 점수부터</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        {[1, 2, 3].map(count => {
                                                            const isSelected = (matrixSelection.top || []).length === count;
                                                            return (
                                                                <button
                                                                    key={count}
                                                                    onClick={() => setSelectionCount('top', count)}
                                                                    style={{
                                                                        padding: '4px 12px', fontSize: '11.5px', borderRadius: '16px',
                                                                        border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                                                        background: isSelected ? '#eff6ff' : '#ffffff',
                                                                        color: isSelected ? '#2563eb' : '#64748b',
                                                                        fontWeight: isSelected ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    {count}개
                                                                </button>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => setSelectionCount('top', 0)}
                                                            style={{
                                                                padding: '4px 12px', fontSize: '11.5px', borderRadius: '16px',
                                                                border: '1px solid #cbd5e1',
                                                                background: (matrixSelection.top || []).length === 0 ? '#f1f5f9' : '#ffffff',
                                                                color: (matrixSelection.top || []).length === 0 ? '#475569' : '#64748b',
                                                                fontWeight: (matrixSelection.top || []).length === 0 ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            안 함
                                                        </button>
                                                    </div>
                                                </div>

                                                <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                                                {/* Mid 선택 */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }} />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>Mid</span>
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>가운데 점수 기준</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        {[1, 2, 3].map(count => {
                                                            const isSelected = (matrixSelection.mid || []).length === count;
                                                            return (
                                                                <button
                                                                    key={count}
                                                                    onClick={() => setSelectionCount('mid', count)}
                                                                    style={{
                                                                        padding: '4px 12px', fontSize: '11.5px', borderRadius: '16px',
                                                                        border: isSelected ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                                                        background: isSelected ? '#fef3c7' : '#ffffff',
                                                                        color: isSelected ? '#d97706' : '#64748b',
                                                                        fontWeight: isSelected ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    {count}개
                                                                </button>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => setSelectionCount('mid', 0)}
                                                            style={{
                                                                padding: '4px 12px', fontSize: '11.5px', borderRadius: '16px',
                                                                border: '1px solid #cbd5e1',
                                                                background: (matrixSelection.mid || []).length === 0 ? '#f1f5f9' : '#ffffff',
                                                                color: (matrixSelection.mid || []).length === 0 ? '#475569' : '#64748b',
                                                                fontWeight: (matrixSelection.mid || []).length === 0 ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            안 함
                                                        </button>
                                                    </div>
                                                </div>

                                                <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                                                {/* Bot 선택 */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }} />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>Bot</span>
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>가장 낮은 점수부터</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        {[1, 2, 3].map(count => {
                                                            const isSelected = (matrixSelection.bot || []).length === count;
                                                            return (
                                                                <button
                                                                    key={count}
                                                                    onClick={() => setSelectionCount('bot', count)}
                                                                    style={{
                                                                        padding: '4px 12px', fontSize: '11.5px', borderRadius: '16px',
                                                                        border: isSelected ? '1px solid #f43f5e' : '1px solid #cbd5e1',
                                                                        background: isSelected ? '#ffe4e6' : '#ffffff',
                                                                        color: isSelected ? '#e11d48' : '#64748b',
                                                                        fontWeight: isSelected ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    {count}개
                                                                </button>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => setSelectionCount('bot', 0)}
                                                            style={{
                                                                padding: '4px 12px', fontSize: '11.5px', borderRadius: '16px',
                                                                border: '1px solid #cbd5e1',
                                                                background: (matrixSelection.bot || []).length === 0 ? '#f1f5f9' : '#ffffff',
                                                                color: (matrixSelection.bot || []).length === 0 ? '#475569' : '#64748b',
                                                                fontWeight: (matrixSelection.bot || []).length === 0 ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            안 함
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 척도별 미리보기 */}
                                            <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>척도별 요약 기준 미리보기</span>
                                                    <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', fontWeight: 600 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} /> Top
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} /> Mid
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} /> Bot
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {[5, 7, 10].map(points => (
                                                        <div key={points} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ width: '32px', fontSize: '11px', fontWeight: 700, color: '#475569' }}>{points}점</span>
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                {Array.from({ length: points }, (_, idx) => {
                                                                    const val = idx + 1;
                                                                    const chipStyle = getPreviewChipStyle(val, points);
                                                                    return (
                                                                        <span
                                                                            key={val}
                                                                            style={{
                                                                                width: '22px', height: '22px', borderRadius: '50%',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                fontSize: '10.5px', fontWeight: 700,
                                                                                background: chipStyle.bg,
                                                                                border: `1px solid ${chipStyle.border}`,
                                                                                color: chipStyle.text,
                                                                                transition: 'all 0.15s'
                                                                            }}
                                                                        >
                                                                            {val}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                            ) : (
                                <>
                                    {/* 오픈형 옵션 */}
                                    <div>
                                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>통계 설정 일괄 적용</div>
                                        <div style={{ display: 'flex', gap: '24px', padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                            {[
                                                { key: 'mean', label: '평균 (Mean)' },
                                                { key: 'median', label: '중앙값 (Median)' },
                                                { key: 'mode', label: '최빈값 (Mode)' }
                                            ].map(stat => (
                                                <label
                                                    key={stat.key}
                                                    className="dp-checkbox-label"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={openStats[stat.key]}
                                                        onChange={() => toggleOpenStat(stat.key)}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                    <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 700 }}>{stat.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 생성 제안 목록 */}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '180px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                            생성 제안 목록 ({wizardProposals.length}개 요약표 제안됨)
                                        </span>
                                        <label
                                            className="dp-checkbox-label"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0, marginLeft: '12px' }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="dp-checkbox-input"
                                                checked={isMergeByTitle}
                                                onChange={(e) => setIsMergeByTitle(e.target.checked)}
                                            />
                                            <span className="dp-checkbox-box" />
                                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>동일 타이틀 합치기</span>
                                        </label>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleToggleAllWizardProposals(true)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}
                                        >
                                            전체 선택
                                        </button>
                                        <span style={{ color: '#cbd5e1' }}>|</span>
                                        <button
                                            onClick={() => handleToggleAllWizardProposals(false)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}
                                        >
                                            전체 해제
                                        </button>
                                    </div>
                                </div>

                                {/* 제안 리스트 스크롤 영역 */}
                                <div style={{
                                    flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px',
                                    background: '#f8fafc', minHeight: '150px', maxHeight: '230px',
                                    display: 'flex', flexDirection: 'column', padding: '8px'
                                }}>
                                    {wizardProposals.length > 0 ? (
                                        wizardProposals.map(prop => {
                                            const isChecked = wizardSelectedIds.has(prop.id);
                                            return (
                                                <div
                                                    key={prop.id}
                                                    onClick={() => toggleWizardProposalSelect(prop.id)}
                                                    className={`wizard-proposal-card ${isChecked ? 'selected' : ''}`}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px',
                                                        borderRadius: '6px',
                                                        border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                                        cursor: 'pointer',
                                                        background: isChecked ? '#eff6ff' : '#ffffff',
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                                                        marginBottom: '6px',
                                                        transition: 'all 0.15s ease-in-out'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => { }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            cursor: 'pointer',
                                                            appearance: 'checkbox',
                                                            WebkitAppearance: 'checkbox',
                                                            width: '13px',
                                                            height: '13px',
                                                            margin: 0,
                                                            verticalAlign: 'middle',
                                                            display: 'inline-block',
                                                            position: 'static',
                                                            opacity: 1
                                                        }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{prop.title}</span>
                                                            {prop.scale_points && (
                                                                <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 4px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                                                    {prop.scale_points}점
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            className="proposal-target-desc"
                                                            title={prop.itemsDesc}
                                                            style={{
                                                                fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px'
                                                            }}
                                                        >
                                                            {prop.itemsDesc}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                        {prop.tags.map(tag => {
                                                            let badgeBg = '#f1f5f9';
                                                            let badgeColor = '#64748b';
                                                            if (tag.includes('Top')) { badgeBg = '#e0f2fe'; badgeColor = '#2563eb'; }
                                                            else if (tag.includes('Mid')) { badgeBg = '#fef3c7'; badgeColor = '#d97706'; }
                                                            else if (tag.includes('Bot')) { badgeBg = '#ffe4e6'; badgeColor = '#ef4444'; }
                                                            else if (tag.includes('평균')) { badgeBg = '#ecfdf5'; badgeColor = '#10b981'; }
                                                            else if (tag.includes('중앙값')) { badgeBg = '#f3e8ff'; badgeColor = '#7e22ce'; }
                                                            else if (tag.includes('최빈값')) { badgeBg = '#ffedd5'; badgeColor = '#c2410c'; }

                                                            return (
                                                                <span
                                                                    key={tag}
                                                                    style={{
                                                                        fontSize: '9.5px', fontWeight: 700, color: badgeColor,
                                                                        background: badgeBg, padding: '2px 6px', borderRadius: '2px'
                                                                    }}
                                                                >
                                                                    {tag}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '130px', fontSize: '12px', color: '#94a3b8' }}>
                                            자동 생성 조건을 만족하는 변수 대상이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 팝업 푸터 */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '8px',
                            padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setIsWizardOpen(false)}
                                style={{
                                    padding: '7px 16px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1',
                                    background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleAddProposals}
                                style={{
                                    padding: '7px 20px', fontSize: '12.5px', borderRadius: '4px', border: 'none',
                                    background: '#2563eb', color: '#ffffff',
                                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                            >
                                <span>{wizardSelectedIds.size}개 생성 목록 추가</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 요약표 수동 생성 설정 모달 */}
            {isManualModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '12px', width: '720px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.15)', overflow: 'hidden'
                    }}>
                        {/* 팝업 헤더 */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                                <span style={{ width: '3px', height: '14px', backgroundColor: '#2563eb', marginRight: '8px', display: 'inline-block' }}></span>
                                <span>요약 설정 생성 ({selectedIds.length}개 문항 선택됨)</span>
                            </div>
                            <button
                                onClick={() => setIsManualModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 모달 콘텐츠 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
                            {currentTab === 'scale' ? (
                                <>
                                    {/* 1. 프리셋 및 기본 정보 */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: '12px',
                                        alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: '6px', border: '1px solid #e2e8f0'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>요약 프리셋 선택</div>
                                            <select
                                                value={manualPresetId}
                                                onChange={(e) => handleManualPresetChange(e.target.value)}
                                                style={{ width: '100%', height: '32px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', padding: '0 8px' }}
                                            >
                                                <option value="custom">직접 설정 (Custom)</option>
                                                {scalePresets.map(preset => (
                                                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>점수 범위 (최댓값)</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    value={manualScaleMin}
                                                    disabled
                                                    style={{ width: '40px', height: '32px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'center' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>~</span>
                                                <input
                                                    type="number"
                                                    value={manualScaleMax}
                                                    onChange={(e) => {
                                                        const val = Math.max(2, Number(e.target.value) || 2);
                                                        setManualScaleMax(val);
                                                        setManualPresetId('custom');
                                                    }}
                                                    style={{ width: '50px', height: '32px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '16px', boxSizing: 'border-box' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={manualIsReverse}
                                                    onChange={(e) => {
                                                        setManualIsReverse(e.target.checked);
                                                        setManualPresetId('custom');
                                                    }}
                                                    style={{ cursor: 'pointer', width: '13px', height: '13px', marginRight: '6px', appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                                                />
                                                <span style={{ fontWeight: 600 }}>역코딩 (역채점)</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 2. 밴딩 설정 목록 */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>밴드 설정 (표시 종류 및 포함 코드)</span>
                                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>* 번호 동그라미를 직접 클릭하면 켜거나 끌 수 있습니다.</div>
                                        </div>

                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {manualBands.map((band) => (
                                                <div key={band.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                                    {/* 종류 매핑용 드롭다운 */}
                                                    <select
                                                        value={band.label.toLowerCase().includes('top') ? 'top' : band.label.toLowerCase().includes('mid') ? 'mid' : 'bot'}
                                                        onChange={(e) => {
                                                            const type = e.target.value;
                                                            setManualBands(prev => prev.map(b => b.id === band.id ? {
                                                                ...b,
                                                                label: type === 'top' ? 'Top2' : type === 'mid' ? 'Mid' : 'Bot2'
                                                            } : b));
                                                            setManualPresetId('custom');
                                                        }}
                                                        style={{ width: '80px', height: '28px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 4px' }}
                                                    >
                                                        <option value="top">Top</option>
                                                        <option value="mid">Mid</option>
                                                        <option value="bot">Bot</option>
                                                    </select>

                                                    {/* 밴드 명칭 입력 */}
                                                    <input
                                                        type="text"
                                                        value={band.label}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setManualBands(prev => prev.map(b => b.id === band.id ? { ...b, label: val } : b));
                                                            setManualPresetId('custom');
                                                        }}
                                                        placeholder="이름"
                                                        style={{ width: '90px', height: '28px', fontSize: '11.5px', padding: '0 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    />

                                                    {/* N 개수 표시 */}
                                                    <div style={{ width: '38px', textAlign: 'center', fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>
                                                        N={getBandValueCount(band.values)}
                                                    </div>

                                                    {/* 값 텍스트 */}
                                                    <input
                                                        type="text"
                                                        value={band.values}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setManualBands(prev => prev.map(b => b.id === band.id ? { ...b, values: val } : b));
                                                            setManualPresetId('custom');
                                                        }}
                                                        placeholder="값 (쉼표 구분)"
                                                        style={{ flex: 1, minWidth: 0, height: '28px', fontSize: '11.5px', padding: '0 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    />

                                                    {/* 서클 토글 미리보기 */}
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0 4px' }}>
                                                        {Array.from({ length: manualScaleMax - manualScaleMin + 1 }, (_, idx) => {
                                                            const num = manualScaleMin + idx;
                                                            const currentVals = band.values.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
                                                            const isSelected = currentVals.includes(num);

                                                            const labelLower = (band.label || '').toLowerCase();
                                                            let circleBg = '#ffffff';
                                                            let circleBorder = '1px solid #cbd5e1';
                                                            let circleColor = '#94a3b8';

                                                            if (isSelected) {
                                                                if (labelLower.includes('top')) {
                                                                    circleBg = '#e0f2fe';
                                                                    circleBorder = '1px solid #3b82f6';
                                                                    circleColor = '#2563eb';
                                                                } else if (labelLower.includes('bot')) {
                                                                    circleBg = '#ffe4e6';
                                                                    circleBorder = '1px solid #f43f5e';
                                                                    circleColor = '#ef4444';
                                                                } else {
                                                                    circleBg = '#f1f5f9';
                                                                    circleBorder = '1px solid #64748b';
                                                                    circleColor = '#475569';
                                                                }
                                                            }

                                                            return (
                                                                <button
                                                                    key={num}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleToggleCircle(band.id, num);
                                                                        setManualPresetId('custom');
                                                                    }}
                                                                    style={{
                                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s',
                                                                        background: circleBg, border: circleBorder, color: circleColor
                                                                    }}
                                                                >
                                                                    {num}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* 삭제 버튼 */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleRemoveManualBand(band.id);
                                                            setManualPresetId('custom');
                                                        }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* 밴드 추가 버튼 */}
                                            <button
                                                type="button"
                                                onClick={handleAddManualBand}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff',
                                                    color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                    padding: '5px 12px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                                                    marginTop: '4px', width: 'fit-content', transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                            >
                                                <Plus size={12} />
                                                <span>밴드 추가</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. 추가 통계 옵션 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                                            <input
                                                type="checkbox"
                                                checked={manualIsMeanIncluded}
                                                onChange={(e) => setManualIsMeanIncluded(e.target.checked)}
                                                style={{ cursor: 'pointer', width: '13.5px', height: '13.5px', marginRight: '6px', appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                                            />
                                            <span style={{ fontWeight: 700, color: '#1e293b' }}>평균 요약표 자동 포함</span>
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* 오픈형(통계) 설정 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>통계 설정 선택</div>
                                        <div style={{ display: 'flex', gap: '24px', padding: '16px 20px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                            {[
                                                { key: 'mean', label: '평균 (Mean)' },
                                                { key: 'median', label: '중앙값 (Median)' },
                                                { key: 'mode', label: '최빈값 (Mode)' }
                                            ].map(stat => (
                                                <label
                                                    key={stat.key}
                                                    className="dp-checkbox-label"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={openStats[stat.key]}
                                                        onChange={() => toggleOpenStat(stat.key)}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                    <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 700 }}>{stat.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 팝업 푸터 */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '8px',
                            padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setIsManualModalOpen(false)}
                                style={{
                                    padding: '7px 16px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1',
                                    background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmManualSummary}
                                style={{
                                    padding: '7px 20px', fontSize: '12.5px', borderRadius: '4px', border: 'none',
                                    background: '#2563eb', color: '#ffffff',
                                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                            >
                                <span>요약표 생성하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 요약표 제목 일괄 수정 모달 */}
            {isBulkTitleModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', width: '960px',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', overflow: 'hidden',
                        border: '1px solid rgba(226, 232, 240, 0.8)'
                    }}>
                        {/* 팝업 헤더 */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '20px 28px', borderBottom: '1px solid #e2e8f0', background: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ width: '4px', height: '18px', background: '#3b82f6', borderRadius: '2px', marginTop: '3px' }}></div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>요약표 제목 일괄 수정</h3>
                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                                        왼쪽 편집창의 전체 목록과 오른쪽의 개별 입력창은 실시간으로 양방향 연동됩니다.
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsBulkTitleModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#475569'} onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* 팝업 바디 (2컬럼 레이아웃) */}
                        <div style={{ display: 'flex', gap: '28px', padding: '28px', height: '480px', minHeight: 0, background: '#ffffff' }}>
                            {/* 좌측 TextArea 영역 */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>복사/붙여넣기 텍스트창</span>
                                        <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>한 줄에 제목 하나씩 입력</span>
                                </div>
                                <textarea
                                    value={bulkTitleText}
                                    onChange={(e) => handleBulkTitleTextChange(e.target.value)}
                                    style={{
                                        flex: 1, width: '100%', padding: '16px', border: '1px solid #cbd5e1',
                                        borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none',
                                        lineHeight: 1.6, color: '#1e293b', fontFamily: 'inherit',
                                        transition: 'border-color 0.15s, box-shadow 0.15s'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#3b82f6';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#cbd5e1';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="요약표 제목 1&#10;요약표 제목 2&#10;요약표 제목 3"
                                />
                            </div>

                            {/* 우측 개별 제목 수정 영역 */}
                            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>개별 제목 수정</span>
                                    <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>클릭하여 각 제목을 개별 수정 가능</span>
                                </div>
                                <div className="custom-scrollbar" style={{
                                    flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px',
                                    background: '#f8fafc', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px'
                                }}>
                                    {modalFolders.map((folder, folderIdx) => (
                                        <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px',
                                                background: '#ffffff', padding: '6px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.01)', transition: 'border-color 0.15s, box-shadow 0.15s'
                                            }}
                                                onFocusCapture={(e) => {
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.08)';
                                                }}
                                                onBlurCapture={(e) => {
                                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    className="srt-bulk-input"
                                                    value={folder.name}
                                                    onChange={(e) => handleIndividualTitleChange(folder.id, e.target.value)}
                                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '600', color: '#1e293b', background: 'transparent' }}
                                                />
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace', marginLeft: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    ID: {folder.id}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 팝업 푸터 */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '8px',
                            padding: '14px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setIsBulkTitleModalOpen(false)}
                                style={{
                                    height: '36px', padding: '0 16px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                    background: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApplyBulkTitleText}
                                style={{
                                    height: '36px', padding: '0 20px', fontSize: '12px', borderRadius: '6px', border: 'none',
                                    background: '#3b82f6', color: '#ffffff', fontWeight: '600', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#3b82f6'; }}
                            >
                                <svg style={{ width: '13px', height: '13px', fill: 'currentColor' }} viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span>일괄 적용</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 교차표 문구 일괄 편집 모달 */}
            {isBulkItemLabelModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', width: '500px',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', overflow: 'hidden',
                        border: '1px solid rgba(226, 232, 240, 0.8)'
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', margin: 0 }}>교차표 문구 일괄 수정</h3>
                            <button onClick={() => { setIsBulkItemLabelModalOpen(false); setActiveBulkItemFolderId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                                현재 요약표에 속한 변수들의 교차표 문구 목록입니다. 줄바꿈 단위로 편집하거나 엑셀 열 데이터를 통째로 복사해서 붙여넣으세요.
                            </div>
                            <textarea
                                value={bulkItemLabelText}
                                onChange={(e) => setBulkItemLabelText(e.target.value)}
                                style={{
                                    width: '100%', height: '240px', padding: '12px', border: '1px solid #cbd5e1',
                                    borderRadius: '6px', fontSize: '12.5px', outline: 'none', resize: 'none',
                                    lineHeight: 1.6, color: '#1e293b', fontFamily: 'inherit'
                                }}
                                placeholder="교차표 문구 1&#10;교차표 문구 2&#10;교차표 문구 3"
                            />
                        </div>
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '8px',
                            padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => { setIsBulkItemLabelModalOpen(false); setActiveBulkItemFolderId(null); }}
                                style={{
                                    padding: '7px 16px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1',
                                    background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApplyBulkItemLabelText}
                                style={{
                                    padding: '7px 20px', fontSize: '12px', borderRadius: '4px', border: 'none',
                                    background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                            >
                                일괄 적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default DpRequestSummaryStep;

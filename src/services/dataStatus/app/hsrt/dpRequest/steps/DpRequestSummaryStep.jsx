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
    const [matrixSelection, setMatrixSelection] = useState({ top: [2], mid: [], bot: [2] });
    const [isMeanIncluded, setIsMeanIncluded] = useState(true);
    const [openStats, setOpenStats] = useState({ mean: true, median: false, mode: false });
    const [isMergeByTitle, setIsMergeByTitle] = useState(true);
    const [wizardSelectedIds, setWizardSelectedIds] = useState(new Set());
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [isSummarySidebarOpen, setIsSummarySidebarOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [summarySearch, setSummarySearch] = useState('');
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
    
    const scrollContainerRef = useRef(null);

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

        const mappedFolders = (overrideFolders || folders).map(f => ({
            stub_id: f.id,
            name: f.name,
            label: f.name,
            type: f.type,
            items: f.items || [],
            include_codes: typeof f.include_codes === 'string' ? f.include_codes.replace(/\s+/g, '') : f.include_codes,
            mean: f.mean,
            median: f.median,
            mode: f.mode
        }));

        const payload = {
            pageid: pageId,
            user: auth?.user?.userId,
            summary_folders: mappedFolders,
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
        const search = summarySearch.toLowerCase().trim();
        if (!search) return tabFilteredVariables;
        return tabFilteredVariables.filter(v =>
            (v.label || '').toLowerCase().includes(search) || (v.id || '').toLowerCase().includes(search)
        );
    }, [tabFilteredVariables, summarySearch]);

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
            setMatrixSelection({ top: [3], mid: [], bot: [3] });
            setIsMeanIncluded(true);
        } else if (preset === 'top2_bot2') {
            setMatrixSelection({ top: [2], mid: [], bot: [2] });
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

    const toggleMatrixCell = (rowName, num) => {
        const row = rowName.toLowerCase();
        setMatrixSelection(prev => {
            const currentList = prev[row] || [];
            const nextList = currentList.includes(num)
                ? currentList.filter(x => x !== num)
                : [...currentList, num];
            return { ...prev, [row]: nextList };
        });
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

                // Top 묶음 제안
                (matrixSelection.top || []).forEach(t => {
                    const sp = group.scalePoints || 7;
                    const codes = Array.from({ length: t }, (_, i) => sp - i).sort((a, b) => a - b).join(',');
                    subItems.push({
                        type: 'frequency',
                        name: `${group.parentLabel} - Top 요약 (${sp}점 척도)`,
                        include_codes: codes,
                        tag: `Top${t}`
                    });
                    tags.push(`Top${t}`);
                });

                // Mid 묶음 제안
                (matrixSelection.mid || []).forEach(m => {
                    const sp = group.scalePoints || 7;
                    const center = Math.ceil(sp / 2);
                    let codes = '';
                    if (m === 1) codes = `${center}`;
                    else if (m === 2) codes = `${center - 1},${center}`;
                    else codes = `${center - 1},${center},${center + 1}`;
                    subItems.push({
                        type: 'frequency',
                        name: `${group.parentLabel} - Mid 요약 (${sp}점 척도)`,
                        include_codes: codes,
                        tag: `Mid${m}`
                    });
                    tags.push(`Mid${m}`);
                });

                // Bot 묶음 제안
                (matrixSelection.bot || []).forEach(b => {
                    const sp = group.scalePoints || 7;
                    const codes = Array.from({ length: b }, (_, i) => i + 1).join(',');
                    subItems.push({
                        type: 'frequency',
                        name: `${group.parentLabel} - Bot 요약 (${sp}점 척도)`,
                        include_codes: codes,
                        tag: `Bot${b}`
                    });
                    tags.push(`Bot${b}`);
                });

                // 평균 요약 제안
                if (isMeanIncluded) {
                    const sp = group.scalePoints || 7;
                    subItems.push({
                        type: 'statistics',
                        name: `${group.parentLabel} - 평균 요약 (${sp}점 척도)`,
                        mean: true,
                        median: false,
                        mode: false,
                        tag: '평균'
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
                    itemsDesc: `대상 문항: ${group.items.map(it => `${it.id}. ${it.label}`).join(', ')}`
                });
            });
        } 
        // 2. 오픈형(숫자) 제안 리스트
        else {
            groupedVariables.forEach(group => {
                const type = (group.type || '').toLowerCase();
                const isOpenNum = type === 'double' || type === 'numeric' || type.includes('숫자') || type === 'open-num';
                if (!isOpenNum) return;

                const subItems = [];
                const tags = [];

                const anyStats = openStats.mean || openStats.median || openStats.mode;
                if (anyStats) {
                    subItems.push({
                        type: 'statistics',
                        name: `${group.parentLabel} - 통계 요약표`,
                        mean: openStats.mean,
                        median: openStats.median,
                        mode: openStats.mode,
                        tag: '통계'
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
                        items: new Set()
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
                itemsDesc: `대상 문항: ${Array.from(m.items).join(', ')}`
            }));
        }

        return proposals;
    }, [wizardTab, matrixSelection, isMeanIncluded, openStats, isMergeByTitle, groupedVariables]);

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

    // 최초 데이터 로딩 시 아코디언 폴더들을 기본적으로 열어둠
    useEffect(() => {
        if (groupedVariables.length > 0 && !hasInitializedExpanded.current) {
            setExpandedParents(new Set(groupedVariables.map(g => g.parentId)));
            hasInitializedExpanded.current = true;
        }
    }, [groupedVariables]);

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
                            onClick={() => setIsWizardOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', fontSize: '13px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '0 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Wand2 size={14} />
                            <span>요약표 자동생성</span>
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
                                
                                setTimeout(() => {
                                    if (scrollContainerRef.current) {
                                        scrollContainerRef.current.scrollTo({
                                            top: scrollContainerRef.current.scrollHeight,
                                            behavior: 'smooth'
                                        });
                                    }
                                }, 100);
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
                                
                                setTimeout(() => {
                                    if (scrollContainerRef.current) {
                                        scrollContainerRef.current.scrollTo({
                                            top: scrollContainerRef.current.scrollHeight,
                                            behavior: 'smooth'
                                        });
                                    }
                                }, 100);
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
                            <span>원본 변수 목록 ({tabFilteredVariables.length})</span>
                            <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsSummarySidebarOpen(false)}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                        
                        {/* 1. 상단 탭 (척도 문항 | 오픈(숫자) 문항) */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <button
                                onClick={() => setCurrentTab('scale')}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: currentTab === 'scale' ? '2px solid #2563eb' : 'none',
                                    color: currentTab === 'scale' ? '#1d4ed8' : '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                척도 문항
                            </button>
                            <button
                                onClick={() => setCurrentTab('open-num')}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: currentTab === 'open-num' ? '2px solid #2563eb' : 'none',
                                    color: currentTab === 'open-num' ? '#1d4ed8' : '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                오픈(숫자) 문항
                            </button>
                        </div>

                        {/* 2. 검색창 */}
                        <div style={{ padding: '12px 12px 6px 12px', flexShrink: 0 }}>
                            <div className="dp-search-input-wrapper" style={{ width: '100%', marginBottom: '0' }}>
                                <Search size={14} className="dp-search-input-icon" />
                                <input
                                    type="text"
                                    placeholder="변수 ID 또는 라벨 검색..."
                                    value={summarySearch}
                                    onChange={(e) => setSummarySearch(e.target.value)}
                                    className="dp-search-input"
                                />
                            </div>
                        </div>

                        {/* 3. 요약 레이블 (선택 정보) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px 8px 12px', fontSize: '11px', color: '#64748b', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <span>{currentTab === 'scale' ? '척도형 문항 목록' : '오픈(숫자) 문항 목록'}</span>
                            <span>선택됨: <strong style={{ color: '#2563eb' }}>{selectedIds.length}</strong>개</span>
                        </div>

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
                                            <Folder size={12} color="#f59e0b" fill="#fef3c7" style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {group.parentLabel}
                                            </span>
                                            <span style={{ fontSize: '9px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>
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
                                                            <span style={{ fontSize: '10.5px', color: '#334155', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {variable.label}
                                                            </span>
                                                            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
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
                    </div>
                </div>

                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div ref={scrollContainerRef} className="dp-table-container custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '16px' }}>
                        {folders.map((folder) => (
                            <div key={folder.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                {/* Folder Header */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0' }}>
                                    <Folder size={18} color="#3b82f6" />
                                    <input
                                        type="text"
                                        value={folder.name}
                                        onChange={(e) => {
                                            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: e.target.value } : f));
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8', marginLeft: '8px', border: 'none', background: 'transparent', outline: 'none', width: '250px' }}
                                    />
                                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', color: '#475569', fontWeight: 600, height: '26px', boxSizing: 'border-box' }}>
                                            {folder.type === 'statistics' ? '통계 요약' : '빈도 요약'}
                                        </span>
                                        {folder.id.includes('auto') && (
                                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', color: '#64748b', height: '26px', boxSizing: 'border-box' }}>
                                                자동 생성됨
                                            </span>
                                        )}
                                        {folder.type === 'frequency' && (
                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', height: '26px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 8px', borderRight: '1px solid #e2e8f0', height: '100%', fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                                    포함 코드
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="예: 4,5"
                                                    value={folder.include_codes || ''}
                                                    onChange={(e) => {
                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, include_codes: e.target.value } : f));
                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                    }}
                                                    style={{ border: 'none', outline: 'none', padding: '0 8px', fontSize: '12px', width: '120px', color: '#0f172a', height: '100%', background: 'transparent' }}
                                                />
                                            </div>
                                        )}
                                        {folder.type === 'statistics' && (
                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', height: '26px', boxSizing: 'border-box', overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 8px', borderRight: '1px solid #e2e8f0', height: '100%', fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                                    포함 항목
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: '12px', height: '100%' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                                                        <input type="checkbox" checked={folder.mean || false} onChange={(e) => {
                                                            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mean: e.target.checked } : f));
                                                            if (onUnsavedChange) onUnsavedChange(true);
                                                        }} style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px', accentColor: '#3b82f6', appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }} />
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>평균</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                                                        <input type="checkbox" checked={folder.mode || false} onChange={(e) => {
                                                            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mode: e.target.checked } : f));
                                                            if (onUnsavedChange) onUnsavedChange(true);
                                                        }} style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px', accentColor: '#3b82f6', appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }} />
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>최빈값</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                                                        <input type="checkbox" checked={folder.median || false} onChange={(e) => {
                                                            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, median: e.target.checked } : f));
                                                            if (onUnsavedChange) onUnsavedChange(true);
                                                        }} style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px', accentColor: '#3b82f6', appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }} />
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>중앙값</span>
                                                    </label>
                                                </div>
                                            </div>
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
                                        <div style={{ width: '1px', height: '16px', background: '#e2e8f0', margin: '0 4px' }} />
                                        <button onClick={() => toggleFolderCollapse(folder.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}>
                                            {collapsedFolders.has(folder.id) ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                        </button>
                                    </div>
                                </div>
                                {/* Folder Body */}
                                {!collapsedFolders.has(folder.id) && (
                                    <div style={{ padding: '12px' }}>

                                        <div
                                            style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', minHeight: '40px',
                                                border: dragOverTarget.folderId === folder.id && dragOverTarget.idx === -1 ? '2px dashed #3b82f6' : '2px dashed transparent',
                                                borderRadius: '8px',
                                                background: dragOverTarget.folderId === folder.id && dragOverTarget.idx === -1 ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
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
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '16px',
                                                            background: '#f1f5f9',
                                                            gap: '4px', cursor: 'grab',
                                                            transition: 'all 0.1s'
                                                        }}
                                                    >
                                                        {/* 드롭 인디케이터 라인 (기존 항목들 사이에 끼워넣는다는 걸 명확히 표시) */}
                                                        {dragOverTarget.folderId === folder.id && dragOverTarget.idx === idx && (
                                                            <div style={{ position: 'absolute', left: '-4px', top: '10%', bottom: '10%', width: '3px', backgroundColor: '#3b82f6', borderRadius: '3px', zIndex: 10 }} />
                                                        )}
                                                        <span title={itemId} style={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', flexShrink: label ? 0 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '2px' }}>{itemId}</span>
                                                        {label && (
                                                            <span title={label} style={{ color: '#475569', fontSize: '11px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '2px' }}>{label}</span>
                                                        )}
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
            
            {/* 요약표 일괄 자동 생성 마법사 모달 */}
            {isWizardOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '12px', width: '640px',
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
                                <span>요약표 일괄 자동 생성</span>
                            </div>
                            <button
                                onClick={() => setIsWizardOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 탭 네비게이션 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <button
                                onClick={() => {
                                    setWizardTab('scale');
                                    handleToggleAllWizardProposals(true);
                                }}
                                style={{
                                    flex: 1, padding: '12px', fontSize: '13px', fontWeight: wizardTab === 'scale' ? 700 : 500,
                                    color: wizardTab === 'scale' ? '#2563eb' : '#64748b', border: 'none', background: 'none',
                                    borderBottom: wizardTab === 'scale' ? '2px solid #2563eb' : '2px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                척도형 (Scale) 자동생성
                            </button>
                            <button
                                onClick={() => {
                                    setWizardTab('open-num');
                                    handleToggleAllWizardProposals(true);
                                }}
                                style={{
                                    flex: 1, padding: '12px', fontSize: '13px', fontWeight: wizardTab === 'open-num' ? 700 : 500,
                                    color: wizardTab === 'open-num' ? '#2563eb' : '#64748b', border: 'none', background: 'none',
                                    borderBottom: wizardTab === 'open-num' ? '2px solid #2563eb' : '2px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                오픈형 (숫자) 자동생성
                            </button>
                        </div>

                        {/* 모달 콘텐츠 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                            {/* 안내 배너 */}
                            <div style={{
                                display: 'flex', gap: '6px', padding: '6px 12px', borderRadius: '4px',
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
                                    <div>
                                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>요약 유형 프리셋 일괄 적용</div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {[
                                                { key: 'top3_bot3', label: 'Top3 · Bot3' },
                                                { key: 'top2_bot2', label: 'Top2 · Bot2' },
                                                { key: 'top1_bot1', label: 'Top1 · Bot1 (박스)' },
                                                { key: 'top_mid_bot', label: 'Top · Mid · Bot' },
                                                { key: 'all', label: '전부 (1·2·3)' },
                                                { key: 'reset', label: '초기화' }
                                            ].map(preset => (
                                                <button
                                                    key={preset.key}
                                                    onClick={() => applyWizardPreset(preset.key)}
                                                    style={{
                                                        padding: '5px 10px', fontSize: '11.5px', borderRadius: '4px',
                                                        border: preset.key === 'reset' ? '1px dashed #cbd5e1' : '1px solid #cbd5e1',
                                                        background: preset.key === 'reset' ? '#f8fafc' : '#ffffff',
                                                        color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = preset.key === 'reset' ? '#f8fafc' : '#ffffff'; }}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        {/* 매트릭스 셀 선택 */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>매트릭스 셀 선택 (N개 점수 묶음)</div>
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', display: 'inline-block', background: '#f8fafc' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '50px 36px 36px 36px', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>종류</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>1</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>2</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>3</span>

                                                    {['Top', 'Mid', 'Bot'].map(row => (
                                                        <React.Fragment key={row}>
                                                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textAlign: 'left' }}>{row}</span>
                                                            {[1, 2, 3].map(col => {
                                                                const isSelected = (matrixSelection[row.toLowerCase()] || []).includes(col);
                                                                
                                                                let btnBg = '#ffffff';
                                                                let btnBorder = '1px solid #cbd5e1';
                                                                let btnColor = '#94a3b8';

                                                                if (isSelected) {
                                                                    if (row === 'Top') {
                                                                        btnBg = '#dbeafe';
                                                                        btnBorder = '1px solid #3b82f6';
                                                                        btnColor = '#1e293b';
                                                                    } else if (row === 'Bot') {
                                                                        btnBg = '#ffe4e6';
                                                                        btnBorder = '1px solid #f43f5e';
                                                                        btnColor = '#1e293b';
                                                                    } else { // Mid
                                                                        btnBg = '#e2e8f0';
                                                                        btnBorder = '1px solid #94a3b8';
                                                                        btnColor = '#1e293b';
                                                                    }
                                                                }

                                                                return (
                                                                    <button
                                                                        key={col}
                                                                        onClick={() => toggleMatrixCell(row, col)}
                                                                        style={{
                                                                            width: '32px', height: '32px', borderRadius: '50%', 
                                                                            border: btnBorder,
                                                                            background: btnBg,
                                                                            color: btnColor,
                                                                            fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        {col}
                                                                    </button>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 추가 통계 옵션 */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>추가 통계 옵션</div>
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', background: '#f8fafc', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '12px', boxSizing: 'border-box' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isMeanIncluded}
                                                        onChange={(e) => setIsMeanIncluded(e.target.checked)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            appearance: 'checkbox',
                                                            WebkitAppearance: 'checkbox',
                                                            width: '14px',
                                                            height: '14px',
                                                            margin: '0 6px 0 0',
                                                            verticalAlign: 'middle',
                                                            display: 'inline-block',
                                                            position: 'static',
                                                            opacity: 1
                                                        }}
                                                    />
                                                    <span style={{ fontWeight: 700, color: '#1e293b' }}>평균 요약표 자동 포함</span>
                                                </label>
                                                <div style={{
                                                    padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                                    background: '#ffffff', fontSize: '10.5px', color: '#64748b', lineHeight: 1.5
                                                }}>
                                                    * 최고점수(Top), 중간점수(Mid), 최저점수(Bot) 기준으로 각 척도에 맞추어 실시간으로 코드 값이 계산 및 매핑됩니다.
                                                </div>
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
                                                <label key={stat.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={openStats[stat.key]}
                                                        onChange={() => toggleOpenStat(stat.key)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            appearance: 'checkbox',
                                                            WebkitAppearance: 'checkbox',
                                                            width: '14px',
                                                            height: '14px',
                                                            margin: '0 6px 0 0',
                                                            verticalAlign: 'middle',
                                                            display: 'inline-block',
                                                            position: 'static',
                                                            opacity: 1
                                                        }}
                                                    />
                                                    <span style={{ fontWeight: 600 }}>{stat.label}</span>
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
                                        <label style={{
                                            display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px',
                                            color: '#475569', fontWeight: 600, userSelect: 'none', gap: '4px'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={isMergeByTitle}
                                                onChange={(e) => setIsMergeByTitle(e.target.checked)}
                                                style={{
                                                    cursor: 'pointer',
                                                    appearance: 'checkbox',
                                                    WebkitAppearance: 'checkbox',
                                                    width: '13px',
                                                    height: '13px',
                                                    margin: '0 2px 0 0',
                                                    verticalAlign: 'middle',
                                                    display: 'inline-block',
                                                    position: 'static',
                                                    opacity: 1
                                                }}
                                            />
                                            <span>동일 타이틀 합치기</span>
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
                                    background: '#ffffff', minHeight: '150px', maxHeight: '230px',
                                    display: 'flex', flexDirection: 'column'
                                }}>
                                    {wizardProposals.length > 0 ? (
                                        wizardProposals.map(prop => {
                                            const isChecked = wizardSelectedIds.has(prop.id);
                                            return (
                                                <div
                                                    key={prop.id}
                                                    onClick={() => toggleWizardProposalSelect(prop.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px',
                                                        borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                                        background: isChecked ? '#f8fafc' : '#ffffff', transition: 'all 0.1s'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}}
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
                                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{prop.title}</div>
                                                        <div style={{
                                                            fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px'
                                                        }}>
                                                            {prop.itemsDesc}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                        {prop.tags.map(tag => {
                                                            let badgeBg = '#f1f5f9';
                                                            let badgeColor = '#64748b';
                                                            if (tag.includes('Top')) { badgeBg = '#e0f2fe'; badgeColor = '#2563eb'; }
                                                            else if (tag.includes('Bot')) { badgeBg = '#ffe4e6'; badgeColor = '#ef4444'; }
                                                            else if (tag.includes('평균')) { badgeBg = '#ecfdf5'; badgeColor = '#10b981'; }

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
                                <span>+ {wizardSelectedIds.size}개 생성 목록 추가</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default DpRequestSummaryStep;

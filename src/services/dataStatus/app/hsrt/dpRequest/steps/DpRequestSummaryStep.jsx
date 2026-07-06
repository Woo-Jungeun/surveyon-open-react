import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, Search, ChevronLeft, ChevronRight, GripVertical, X, Wand2, Copy, Edit, Trash2 } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DpRequestManualSummaryModal from './DpRequestManualSummaryModal';



const DpRequestSummaryStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getSummaryDetail, saveSummaryDetail, getTableDetail } = DpRequestPageApi();
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


    const [baseVariables, setBaseVariables] = useState([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardTab, setWizardTab] = useState('scale'); // 'scale' | 'open-num'
    const [matrixSelection, setMatrixSelection] = useState({ top: [1, 2], mid: [], bot: [1, 2] });
    const [isMeanIncluded, setIsMeanIncluded] = useState(true);
    const [openStats, setOpenStats] = useState({ mean: true, median: false, mode: false });
    const [isMergeByTitle, setIsMergeByTitle] = useState(false);
    const [wizardSelectedIds, setWizardSelectedIds] = useState(new Set());
    const [isSummarySidebarOpen, setIsSummarySidebarOpen] = useState(true);
    const [summarySearchMap, setSummarySearchMap] = useState({ scale: '', 'open-num': '' });
    const [scalePresets, setScalePresets] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentTab, setCurrentTab] = useState('scale'); // 'scale' (척도 문항) | 'open-num' (오픈(숫자) 문항)
    const [expandedParents, setExpandedParents] = useState(new Set());

    // --- 삭제 관리용 스테이트 추가 ---
    const [deletedSummaryIds, setDeletedSummaryIds] = useState([]); // 서버에 실제 삭제 요청할 ID들
    const [originalFolderIds, setOriginalFolderIds] = useState([]); // 초기 로딩된 폴더 ID 목록 (신규 생성 구분용)
    const [draggedFolderId, setDraggedFolderId] = useState(null); // 드래그 중인 폴더 ID
    const [dragOverFolderId, setDragOverFolderId] = useState(null); // 드래그 오버 중인 대상 폴더 ID
    const [dragEnabledFolderId, setDragEnabledFolderId] = useState(null); // 드래그가 활성화된 폴더 ID

    // --- 일괄 편집 관련 상태 추가 ---
    const [expandedFolders, setExpandedFolders] = useState(new Set()); // 상세보기 활성화 폴더 ID
    const [isBulkTitleModalOpen, setIsBulkTitleModalOpen] = useState(false); // 제목 일괄 편집 모달 여부
    const [bulkTitleText, setBulkTitleText] = useState(''); // 제목 일괄 편집용 텍스트
    const [isBulkItemLabelModalOpen, setIsBulkItemLabelModalOpen] = useState(false); // 교차표 문구 일괄 수정 모달 여부
    const [activeBulkItemFolderId, setActiveBulkItemFolderId] = useState(null); // 활성화된 교차표 문구 일괄 편집 폴더
    const [bulkItemLabelText, setBulkItemLabelText] = useState(''); // 교차표 문구 일괄 편집용 텍스트
    const [modalFolders, setModalFolders] = useState([]); // 제목 일괄 편집 모달용 로컬 폴더 리스트

    // --- 수동 요약 생성 관련 상태 추가 ---
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualModalMode, setManualModalMode] = useState('create');
    const [editingFolder, setEditingFolder] = useState(null);

    // 신규 생성된 폴더 하이라이트 효과용 상태
    const [newlyCreatedFolderIds, setNewlyCreatedFolderIds] = useState(new Set());

    // 2.5초 후 하이라이트 투명하게 복구
    useEffect(() => {
        if (newlyCreatedFolderIds.size > 0) {
            const timer = setTimeout(() => {
                setNewlyCreatedFolderIds(new Set());
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [newlyCreatedFolderIds]);

    // 최하단 스크롤용 함수
    const scrollSmoothToBottom = () => {
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const toggleFolderExpand = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    // 요약표 제목 일괄 편집 모달 열기
    const handleOpenBulkTitleModal = () => {
        const targetFolders = folders.filter(folder => currentTab === 'scale' ? folder.type === 'frequency' : folder.type === 'statistics');
        const names = targetFolders.map(f => f.name).join('\n');
        setBulkTitleText(names);
        setModalFolders(targetFolders.map(f => ({ ...f })));
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
        setFolders(prev => {
            return prev.map(f => {
                const updated = modalFolders.find(m => m.id === f.id);
                return updated ? { ...f, name: updated.name } : f;
            });
        });
        setIsBulkTitleModalOpen(false);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // 교차표 문구 일괄 편집 모달 열기
    const handleOpenBulkItemLabelModal = (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;
        const labels = folder.items.map(itemId => {
            const varInfo = summaries.find(s => s.id === itemId);
            if (varInfo && varInfo.label) return varInfo.label;
            const baseVar = baseVariables.find(v => v.id === itemId || v.base_id === itemId);
            return baseVar ? baseVar.label || baseVar.name : itemId;
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

        setSummaries(prev => {
            let next = [...prev];
            folder.items.forEach((itemId, idx) => {
                const textVal = lines[idx];
                if (textVal !== undefined && textVal !== '') {
                    const existsIdx = next.findIndex(s => s.id === itemId);
                    if (existsIdx !== -1) {
                        next[existsIdx] = { ...next[existsIdx], label: textVal };
                    } else {
                        const baseVar = baseVariables.find(v => v.id === itemId || v.base_id === itemId);
                        next.push({
                            id: itemId,
                            label: textVal,
                            subId: itemId,
                            type: baseVar?.type || 'frequency',
                            info: baseVar?.info || baseVar?.categories || []
                        });
                    }
                }
            });
            return next;
        });

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
            setSummaries(prev => {
                let next = [...prev];
                items.forEach((itemId, idx) => {
                    if (idx >= startIdx) {
                        const offset = idx - startIdx;
                        const textVal = lines[offset];
                        if (textVal !== undefined && textVal !== '') {
                            const existsIdx = next.findIndex(s => s.id === itemId);
                            if (existsIdx !== -1) {
                                next[existsIdx] = { ...next[existsIdx], label: textVal };
                            } else {
                                const baseVar = baseVariables.find(v => v.id === itemId || v.base_id === itemId);
                                next.push({
                                    id: itemId,
                                    label: textVal,
                                    subId: itemId,
                                    type: baseVar?.type || 'frequency',
                                    info: baseVar?.info || baseVar?.categories || []
                                });
                            }
                        }
                    }
                });
                return next;
            });
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


    useEffect(() => {
        if (!folders || folders.length === 0) return;
        setFolders(prev => {
            let changed = false;
            const next = prev.map(f => {
                if (!f.allowedBadges) {
                    changed = true;
                    const badges = [];
                    const firstItemId = f.items && f.items[0];
                    const associatedVar = summaries.find(s => s.id === firstItemId);
                    const scalePoints = associatedVar?.scale_points || 7;

                    if (f.type === 'statistics') {
                        if (f.mean) badges.push('평균');
                        if (f.median) badges.push('중앙값');
                        if (f.mode) badges.push('최빈값');
                    } else {
                        const codes = f.include_codes || '';
                        const hasTopCodes = codes.includes(String(scalePoints)) || codes.includes(String(scalePoints - 1));
                        const hasBotCodes = codes.includes('1') || codes.includes('2');
                        if (hasTopCodes) badges.push('Top2');
                        if (hasBotCodes) badges.push('Bot2');
                        if (f.mean) badges.push('평균');
                    }
                    if (badges.length === 0) {
                        if (f.type === 'statistics') badges.push('평균', '중앙값', '최빈값');
                        else badges.push('Top2', 'Bot2', '평균');
                    }
                    return { ...f, allowedBadges: badges };
                }
                return f;
            });
            return changed ? next : prev;
        });
    }, [folders, summaries]);

    // --- Interaction Logic ---

    const handleFolderItemDragStart = (e, folderId) => {
        setDraggedFolderId(folderId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleFolderItemDragOver = (e, targetFolderId) => {
        e.preventDefault();
        if (draggedFolderId === null || draggedFolderId === targetFolderId) {
            setDragOverFolderId(null);
            return;
        }
        setDragOverFolderId(targetFolderId);
    };

    const handleFolderItemDragLeave = () => {
        setDragOverFolderId(null);
    };

    const handleFolderItemDrop = (e, targetFolderId) => {
        e.preventDefault();
        if (draggedFolderId === null || draggedFolderId === targetFolderId) {
            setDraggedFolderId(null);
            setDragOverFolderId(null);
            return;
        }

        setFolders(prev => {
            const fromIdx = prev.findIndex(f => f.id === draggedFolderId);
            const toIdx = prev.findIndex(f => f.id === targetFolderId);
            if (fromIdx === -1 || toIdx === -1) return prev;

            const updated = [...prev];
            const [moved] = updated.splice(fromIdx, 1);
            updated.splice(toIdx, 0, moved);
            return updated;
        });

        setDraggedFolderId(null);
        setDragOverFolderId(null);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleFolderItemDragEnd = () => {
        setDraggedFolderId(null);
        setDragOverFolderId(null);
        setDragEnabledFolderId(null);
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
                const sourceVars = result.resultjson.summary_source_variables || [];
                const sourceVarsList = Array.isArray(sourceVars) ? sourceVars : Object.values(sourceVars);
                setBaseVariables(sourceVarsList);

                // --- 신규 백엔드 스펙(summary_tables) 기반 로드 복구 ---
                const rawTables = result.resultjson.summary_tables || [];
                const tablesList = Array.isArray(rawTables) ? rawTables : Object.values(rawTables);

                const uniqueFolders = [];
                const formattedSummaries = [];

                tablesList.forEach(table => {
                    const firstItemId = table.vars && table.vars[0] && table.vars[0].name.replace(/_(mean|median|mode)$/, '');
                    let folderType = 'frequency';

                    if (firstItemId) {
                        const baseVar = sourceVarsList.find(v => v.id === firstItemId || v.base_id === firstItemId);
                        if (baseVar) {
                            const varType = (baseVar.type || '').toLowerCase();
                            if (varType === 'double' || varType === 'numeric' || varType.includes('숫자') || varType === 'open-num') {
                                folderType = 'statistics';
                            }
                        }
                    }

                    uniqueFolders.push({
                        id: table.id,
                        name: table.name,
                        type: folderType,
                        items: [...new Set((table.vars || []).map(v => v.name.replace(/_(mean|median|mode)$/, '')))],
                        reverse: table.reverse === true || table.reverse === 'true',
                        scale_points: table.scale ? Number(table.scale) : 5,
                        scale_preset_id: table.scale_preset_id || null,
                        mean: table.stats ? (table.stats.mean === true || table.stats.mean === 'true' || table.stats.mean === 1 || table.stats.mean === '1') : false,
                        median: table.stats ? (table.stats.median === true || table.stats.median === 'true' || table.stats.median === 1 || table.stats.median === '1') : false,
                        mode: table.stats ? (table.stats.mode === true || table.stats.mode === 'true' || table.stats.mode === 1 || table.stats.mode === '1') : false
                    });

                    (table.vars || []).forEach(v => {
                        const infoList = [];
                        const baseName = v.name.replace(/_(mean|median|mode)$/, '');
                        if (folderType === 'frequency') {
                            if (table.bands && Array.isArray(table.bands)) {
                                table.bands.forEach(b => {
                                    infoList.push({
                                        type: 'frequency',
                                        name: b.kind,
                                        include_codes: Array.isArray(b.values) ? b.values.join(',') : '',
                                        tag: b.kind,
                                        label: b.kind
                                    });
                                });
                            }
                            if (table.stats && (table.stats.mean || table.stats.median || table.stats.mode)) {
                                infoList.push({
                                    type: 'statistics',
                                    name: '평균 요약',
                                    mean: table.stats.mean === true || table.stats.mean === 'true' || table.stats.mean === 1 || table.stats.mean === '1',
                                    median: table.stats.median === true || table.stats.median === 'true' || table.stats.median === 1 || table.stats.median === '1',
                                    mode: table.stats.mode === true || table.stats.mode === 'true' || table.stats.mode === 1 || table.stats.mode === '1',
                                    tag: 'mean'
                                });
                            }
                        } else {
                            if (table.stats) {
                                infoList.push({
                                    type: 'statistics',
                                    name: '평균 요약',
                                    mean: table.stats.mean === true || table.stats.mean === 'true' || table.stats.mean === 1 || table.stats.mean === '1',
                                    median: table.stats.median === true || table.stats.median === 'true' || table.stats.median === 1 || table.stats.median === '1',
                                    mode: table.stats.mode === true || table.stats.mode === 'true' || table.stats.mode === 1 || table.stats.mode === '1',
                                    tag: 'mean'
                                });
                            }
                        }

                        formattedSummaries.push({
                            id: v.name,
                            label: v.label || baseName,
                            subId: v.name,
                            info: infoList.map(item => ({ ...item, inEdit: false }))
                        });
                    });
                });

                setFolders(uniqueFolders);
                setOriginalFolderIds(uniqueFolders.map(f => f.id));
                setSummaries(formattedSummaries);
                history.reset(formattedSummaries);

                setDeletedSummaryIds([]);

                if (formattedSummaries.length > 0) {
                    const target = isFresh ? formattedSummaries[formattedSummaries.length - 1] : formattedSummaries[0];
                    if (isFresh || !selectedSummary) {
                        setSelectedSummary(target.id);
                    }
                }
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const handleSaveSummary = async (overrideFolders = null, overrideDeleteIds = null, successMessage = '요약표가 저장되었습니다.') => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return false;

        const payloadTables = [];

        const getBandValues = (kind, scale) => {
            const numMatch = kind.match(/\d+/);
            const num = numMatch ? parseInt(numMatch[0]) : 1;
            const k = kind.toLowerCase();
            const values = [];
            if (k.includes('top')) {
                for (let v = scale; v > scale - num; v--) {
                    if (v >= 1) values.push(v);
                }
            } else if (k.includes('bot')) {
                for (let v = 1; v <= num; v++) {
                    if (v <= scale) values.push(v);
                }
            } else if (k.includes('mid')) {
                const midVal = Math.ceil(scale / 2);
                values.push(midVal);
            }
            return values.sort((a, b) => a - b);
        };

        (overrideFolders || folders).forEach(f => {
            const firstItemId = f.items && f.items[0];

            // 척도 및 최소값 추출
            let scalePoints = 7;
            if (firstItemId) {
                const baseVar = baseVariables.find(v => v.id === firstItemId || v.base_id === firstItemId);
                if (baseVar) {
                    scalePoints = baseVar.scale_points || 7;
                }
            }

            // bands 및 stats 수집
            const bands = [];
            let meanVal = false;
            let medianVal = false;
            let modeVal = false;

            const assocSummary = summaries.find(s => s.id === f.id) ||
                summaries.find(s => f.items && f.items.includes(s.id)) ||
                summaries.find(s => s.id === firstItemId);

            if (assocSummary && Array.isArray(assocSummary.info)) {
                assocSummary.info.forEach(item => {
                    if (item.disabled) return;
                    const isStatistics = item.type === 'statistics' || item.type === 'mean' || item.type === 'median' || item.type === 'mode';
                    if (!isStatistics) {
                        const tagLabel = item.tag || item.label || item.name || '';
                        const cleanTag = tagLabel.replace(/\s*요약\s*$/, '').trim();
                        if (cleanTag) {
                            bands.push({
                                kind: cleanTag,
                                values: getBandValues(cleanTag, scalePoints)
                            });
                        }
                    } else {
                        const isMean = item.mean === true || item.mean === 'true' || item.mean === 1 || item.mean === '1' || item.tag === 'mean' || item.value_id === 'mean';
                        const isMedian = item.median === true || item.median === 'true' || item.median === 1 || item.median === '1' || item.tag === 'median' || item.value_id === 'median';
                        const isMode = item.mode === true || item.mode === 'true' || item.mode === 1 || item.mode === '1' || item.tag === 'mode' || item.value_id === 'mode';

                        if (isMean) meanVal = true;
                        if (isMedian) medianVal = true;
                        if (isMode) modeVal = true;
                    }
                });
            } else {
                meanVal = f.mean === true;
                medianVal = f.median === true;
                modeVal = f.mode === true;
            }

            // vars 구성
            let vars = [];
            if (f.type === 'statistics') {
                (f.items || []).forEach(itemId => {
                    const hasMean = meanVal;
                    const hasMedian = medianVal;
                    const hasMode = modeVal;

                    const meanLabel = summaries.find(s => s.id === itemId + '_mean')?.label ?? 'mean';
                    const medianLabel = summaries.find(s => s.id === itemId + '_median')?.label ?? 'median';
                    const modeLabel = summaries.find(s => s.id === itemId + '_mode')?.label ?? 'mode';

                    if (hasMean) vars.push({ name: itemId + '_mean', label: meanLabel });
                    if (hasMedian) vars.push({ name: itemId + '_median', label: medianLabel });
                    if (hasMode) vars.push({ name: itemId + '_mode', label: modeLabel });

                    if (vars.length === 0) {
                        vars.push({ name: itemId + '_mean', label: meanLabel });
                    }
                });
            } else {
                vars = (f.items || []).map(itemId => {
                    const varInfo = summaries.find(s => s.id === itemId);
                    const baseVar = baseVariables.find(v => v.id === itemId || v.base_id === itemId);
                    const showLabel = baseVar ? baseVar.label || baseVar.name : itemId;
                    const finalLabel = varInfo ? varInfo.label : showLabel;
                    return {
                        name: itemId,
                        label: finalLabel
                    };
                });
            }

            payloadTables.push({
                id: f.id,
                name: f.name,
                scale: scalePoints,
                min: 1,
                reverse: f.reverse === true,
                vars: vars,
                bands: bands,
                stats: {
                    mean: meanVal,
                    sd: false,
                    median: medianVal,
                    mode: modeVal
                }
            });
        });

        const rawDeleteIds = overrideDeleteIds || deletedSummaryIds;
        const cleanDeleteIds = Array.isArray(rawDeleteIds) ? rawDeleteIds.filter(id => id && String(id).trim() !== "") : [];

        const payload = {
            pageid: pageId,
            user: auth?.user?.userId,
            summary_tables: payloadTables,
            delete_ids: cleanDeleteIds
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

    const tabSelectedCount = useMemo(() => {
        const tabVarIds = new Set(tabFilteredVariables.map(v => v.id));
        return selectedIds.filter(id => tabVarIds.has(id)).length;
    }, [tabFilteredVariables, selectedIds]);

    const activeTabSelectedIds = useMemo(() => {
        const tabVarIds = new Set(tabFilteredVariables.map(v => v.id));
        return selectedIds.filter(id => tabVarIds.has(id));
    }, [tabFilteredVariables, selectedIds]);

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

    const totalWizardSubItemsCount = useMemo(() => {
        const selectedProposals = wizardProposals.filter(p => wizardSelectedIds.has(p.id));
        return selectedProposals.reduce((sum, p) => sum + (p.subItems || []).length, 0);
    }, [wizardProposals, wizardSelectedIds]);

    // --- 수동 요약 생성 팝업 핸들러 및 비즈니스 로직 ---

    const handleOpenManualSummaryModal = () => {
        if (activeTabSelectedIds.length === 0) return;

        // 척도 정합성 일치 검사 (동일한 척도로만 생성 가능하도록 제한)
        const scalePointsSet = new Set();
        activeTabSelectedIds.forEach(id => {
            const v = summaryVariables.find(item => item.id === id);
            if (v && v.scale_points !== undefined && v.scale_points !== null) {
                scalePointsSet.add(v.scale_points);
            }
        });
        if (scalePointsSet.size > 1) {
            modal.showAlert('알림', '동일한 척도의 변수로만 요약표를 생성할 수 있습니다.');
            return;
        }

        setManualModalMode('create');
        setEditingFolder(null);
        setIsManualModalOpen(true);
    };

    const handleOpenEditModal = (folder) => {
        setManualModalMode('edit');
        setEditingFolder(folder);
        setIsManualModalOpen(true);
    };

    const getBandValueCount = (valStr) => {
        if (!valStr) return 0;
        return valStr.split(',').map(s => s.trim()).filter(s => s !== '' && !isNaN(Number(s))).length;
    };

    const handleConfirmManualSummary = (data) => {
        const { scaleMax, presetId, isReverse, bands, isMeanIncluded, openStats } = data;

        if (manualModalMode === 'edit') {
            if (!editingFolder) return;

            const targetFolder = folders.find(f => f.id === editingFolder.id);
            if (!targetFolder) return;

            const varId = targetFolder.items[0];
            const baseVar = baseVariables.find(v => v.id === varId);
            const varLabel = baseVar?.label || baseVar?.name || varId;
            const sp = scaleMax;

            if (targetFolder.type === 'statistics') {
                const subItems = [];
                subItems.push({
                    type: 'statistics',
                    name: `${varLabel} - 통계 요약표`,
                    mean: !!openStats.mean,
                    median: !!openStats.median,
                    mode: !!openStats.mode
                });

                const newFolders = folders.map(f => {
                    if (f.id === editingFolder.id) {
                        return {
                            ...f,
                            name: `${varLabel} - 통계 요약표`,
                            label: `${varLabel} - 통계 요약표`,
                            mean: !!openStats.mean,
                            median: !!openStats.median,
                            mode: !!openStats.mode
                        };
                    }
                    return f;
                });
                setFolders(newFolders);

                setSummaries(prev => prev.map(s => {
                    const isTarget = s.id === editingFolder.id || s.id === varId;
                    if (isTarget) {
                        return {
                            ...s,
                            label: `${varLabel} - 통계 요약표`,
                            info: subItems.map(si => ({ ...si, inEdit: false }))
                        };
                    }
                    return s;
                }));

                setIsManualModalOpen(false);
                if (onUnsavedChange) onUnsavedChange(true);
                return;
            }

            const subItems = [];
            bands.forEach(band => {
                subItems.push({
                    type: 'frequency',
                    name: `${varLabel} - ${band.label} 요약`,
                    include_codes: band.values,
                    tag: band.label,
                    label: band.label
                });
            });

            if (isMeanIncluded) {
                subItems.push({
                    type: 'statistics',
                    name: `${varLabel} - 평균 요약 (${sp}점 척도)`,
                    mean: true,
                    median: false,
                    mode: false,
                    tag: 'mean'
                });
            }
            const newFolders = folders.map(f => {
                if (f.id === editingFolder.id) {
                    return {
                        ...f,
                        scale_points: sp,
                        scale_preset_id: presetId !== 'custom' ? presetId : null,
                        reverse: isReverse === true,
                        mean: isMeanIncluded,
                        median: false,
                        mode: false
                    };
                }
                return f;
            });
            setFolders(newFolders);

            setSummaries(prev => {
                const next = prev.map(s => {
                    const isTarget = s.id === editingFolder.id ||
                        (targetFolder && s.id === targetFolder.id) ||
                        (targetFolder && targetFolder.items && targetFolder.items.includes(s.id)) ||
                        (targetFolder && targetFolder.items && s.id === targetFolder.items[0]);
                    if (isTarget) {
                        return {
                            ...s,
                            info: subItems.map(si => ({ ...si, inEdit: false }))
                        };
                    }
                    return s;
                });
                return next;
            });

            setIsManualModalOpen(false);
            if (onUnsavedChange) onUnsavedChange(true);
            return;
        }

        if (activeTabSelectedIds.length === 0) {
            modal.showAlert('알림', '선택된 변수가 없습니다.');
            return;
        }

        // 척도 일치 여부 검사 (다른 척도 혼용 방지)
        const scalePointsSet = new Set();
        activeTabSelectedIds.forEach(varId => {
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

        const firstVarId = activeTabSelectedIds[0];
        const baseVar = baseVariables.find(v => v.id === firstVarId || v.base_id === firstVarId);
        const varLabel = baseVar?.label || baseVar?.name || firstVarId;
        const sp = baseVar?.scale_points || scaleMax;

        let folderId = firstVarId;
        let counter = 2;
        while (folders.some(f => f.id === folderId)) {
            folderId = `${firstVarId}_${counter}`;
            counter++;
        }

        if (currentTab === 'scale') {
            const folderName = activeTabSelectedIds.length > 1
                ? `${varLabel} 외 ${activeTabSelectedIds.length - 1}개 - 요약표`
                : `${varLabel} - 요약표`;

            const subItems = [];
            bands.forEach(band => {
                subItems.push({
                    type: 'frequency',
                    name: `${folderName} - ${band.label} 요약`,
                    include_codes: band.values,
                    tag: band.label
                });
            });

            if (isMeanIncluded) {
                subItems.push({
                    type: 'statistics',
                    name: `${folderName} - 평균 요약 (${sp}점 척도)`,
                    mean: true,
                    median: false,
                    mode: false,
                    tag: 'mean'
                });
            }

            const newFolder = {
                id: folderId,
                name: folderName,
                label: folderName,
                type: 'frequency',
                scale_points: sp,
                scale_preset_id: presetId !== 'custom' ? presetId : null,
                items: [...activeTabSelectedIds],
                reverse: isReverse === true,
                mean: isMeanIncluded,
                median: false,
                mode: false
            };
            uniqueFolders.push(newFolder);

            const formatted = {
                id: folderId,
                label: varLabel,
                subId: folderId,
                info: subItems.map(si => ({ ...si, inEdit: false }))
            };
            newSummaries.push(formatted);
        } else {
            // 오픈형 생성
            const folderName = activeTabSelectedIds.length > 1
                ? `${varLabel} 외 ${activeTabSelectedIds.length - 1}개 - 통계 요약표`
                : `${varLabel} - 통계 요약표`;

            const subItems = [];
            subItems.push({
                type: 'statistics',
                name: `${folderName} - 통계 요약표`,
                mean: !!openStats.mean,
                median: !!openStats.median,
                mode: !!openStats.mode
            });

            const newFolder = {
                id: folderId,
                name: folderName,
                label: folderName,
                type: 'statistics',
                items: [...activeTabSelectedIds],
                mean: !!openStats.mean,
                median: !!openStats.median,
                mode: !!openStats.mode
            };
            uniqueFolders.push(newFolder);

            const formatted = {
                id: folderId,
                label: varLabel,
                subId: folderId,
                info: subItems.map(si => ({ ...si, inEdit: false }))
            };
            newSummaries.push(formatted);
        }

        setFolders(uniqueFolders);
        setSummaries(prev => [...prev, ...newSummaries]);
        setSelectedSummary(newSummaries[0]?.id || null);

        // 신규 생성 폴더 자동 열기 및 하이라이트 등록
        const newFolderIds = newSummaries.map(ns => ns.id);
        setNewlyCreatedFolderIds(new Set(newFolderIds));
        setExpandedFolders(prev => {
            const next = new Set(prev);
            newFolderIds.forEach(id => next.add(id));
            return next;
        });

        // 최하단 스크롤
        scrollSmoothToBottom();

        // 히스토리 업데이트 연동
        if (history && typeof history.commit === 'function') {
            history.commit({
                folders: uniqueFolders,
                summaries: [...summaries, ...newSummaries]
            });
        }

        setIsManualModalOpen(false);
        setSelectedIds(prev => prev.filter(id => !activeTabSelectedIds.includes(id)));
        modal.showAlert('성공', '선택된 변수로 요약표가 성공적으로 생성되었습니다.');
        if (onUnsavedChange) onUnsavedChange(true);
    };

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

        if (totalWizardSubItemsCount === 0) {
            modal.showAlert('알림', '생성할 요약표 옵션(Top/Mid/Bot/평균 등)이 선택되지 않았습니다.');
            return;
        }

        const newFoldersToAdd = [];
        const newSummariesToAdd = [];

        selectedProposals.forEach(prop => {
            const folderId = prop.items[0];
            const subItems = [];

            if (wizardTab === 'scale') {
                const freqItems = prop.subItems.filter(item => item.type === 'frequency');
                freqItems.forEach(item => {
                    const labelLower = item.tag.toLowerCase();
                    let cleanTag = 'Top';
                    if (labelLower.includes('mid')) cleanTag = 'Mid';
                    else if (labelLower.includes('bot')) cleanTag = 'Bot';

                    const nVal = getBandValueCount(item.include_codes);
                    const finalTag = nVal > 1 ? `${cleanTag}${nVal}` : cleanTag;

                    subItems.push({
                        type: 'frequency',
                        name: item.name.replace(/ - (Top|Mid|Bot) 요약/, ` - ${finalTag} 요약`),
                        include_codes: item.include_codes,
                        tag: finalTag
                    });
                });

                const hasMean = prop.subItems.some(item => item.type === 'statistics' && item.mean);
                if (hasMean) {
                    subItems.push({
                        type: 'statistics',
                        name: `${prop.groupLabel} - 평균 요약 (${prop.scale_points}점 척도)`,
                        mean: true,
                        median: false,
                        mode: false,
                        tag: 'mean'
                    });
                }

                newFoldersToAdd.push({
                    id: folderId,
                    name: prop.title,
                    label: prop.title,
                    type: 'frequency',
                    scale_points: prop.scale_points,
                    scale_preset_id: null,
                    items: [...prop.items]
                });
            } else {
                const statItem = prop.subItems.find(item => item.type === 'statistics');
                if (statItem) {
                    subItems.push({
                        type: 'statistics',
                        name: statItem.name,
                        mean: !!statItem.mean,
                        median: !!statItem.median,
                        mode: !!statItem.mode
                    });
                }

                newFoldersToAdd.push({
                    id: folderId,
                    name: prop.title,
                    label: prop.title,
                    type: 'statistics',
                    items: [...prop.items]
                });
            }

            newSummariesToAdd.push({
                id: folderId,
                label: prop.title,
                subId: folderId,
                info: subItems.map(si => ({ ...si, inEdit: false }))
            });
        });

        setFolders(prev => {
            const next = [...prev];
            newFoldersToAdd.forEach(newF => {
                const idx = next.findIndex(f => f.id === newF.id);
                if (idx > -1) {
                    next[idx] = newF;
                } else {
                    next.push(newF);
                }
            });
            return next;
        });
        setSummaries(prev => {
            const next = [...prev];
            newSummariesToAdd.forEach(newS => {
                const idx = next.findIndex(s => s.id === newS.id);
                if (idx > -1) {
                    next[idx] = newS;
                } else {
                    next.push(newS);
                }
            });
            return next;
        });

        // 신규 자동 생성 폴더 자동 열기 및 하이라이팅 등록
        const autoFolderIds = newSummariesToAdd.map(ns => ns.id);
        setNewlyCreatedFolderIds(new Set(autoFolderIds));
        setExpandedFolders(prev => {
            const next = new Set(prev);
            autoFolderIds.forEach(id => next.add(id));
            return next;
        });

        // 첫 번째 폴더를 자동 선택하여 펼치기
        if (newSummariesToAdd.length > 0) {
            setSelectedSummary(newSummariesToAdd[0].id);
        }

        setIsWizardOpen(false);
        if (onUnsavedChange) onUnsavedChange(true);

        // 최하단 스크롤
        scrollSmoothToBottom();
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
        <div className="dp-request-container" style={{ background: '#f8fafc', gap: 0, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
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
                                <span>원본 변수 목록 ({searchedVariables.length})</span>
                                {tabSelectedCount > 0 && (
                                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', height: '18px' }}>
                                        선택 {tabSelectedCount}
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
                                disabled={tabSelectedCount === 0}
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
                                    background: tabSelectedCount > 0 ? '#2563eb' : '#cbd5e1',
                                    color: '#ffffff',
                                    cursor: tabSelectedCount > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    boxShadow: tabSelectedCount > 0 ? '0 2px 4px rgba(37, 99, 235, 0.15)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (tabSelectedCount > 0) e.currentTarget.style.background = '#1d4ed8';
                                }}
                                onMouseLeave={(e) => {
                                    if (tabSelectedCount > 0) e.currentTarget.style.background = '#2563eb';
                                }}
                            >
                                <span>요약표 생성 ({tabSelectedCount}개 선택됨)</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div ref={scrollContainerRef} className="dp-table-container custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '16px', display: 'flex', flexDirection: 'column' }}>
                        {/* 생성된 요약표 목록 헤더 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                생성된 요약표 목록 ({filteredFolders.length}개)
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
                                    <span>제목 일괄 편집</span>
                                </button>
                                <button
                                    className="dp-btn-delete-all"
                                    onClick={() => {
                                        modal.showConfirm('알림', '생성된 모든 요약표를 삭제하시겠습니까?', {
                                            btns: [
                                                { title: "취소", click: () => { } },
                                                {
                                                    title: "확인",
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
                                    <Trash2 size={13} style={{ color: '#ef4444', stroke: '#ef4444' }} />
                                    <span>전체 삭제</span>
                                </button>
                            </div>
                        </div>

                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '4px',
                            flex: 1,
                            minHeight: '300px'
                        }}>
                            {filteredFolders.length > 0 ? (
                                filteredFolders.map((folder) => {
                                    const isExpanded = expandedFolders.has(folder.id);

                                    const scalePoints = summaries.find(s => folder.items && folder.items.includes(s.id))?.scale_points || 7;
                                    const isStatistics = folder.type === 'statistics';

                                    const badgeList = [];
                                    const assocSummary = summaries.find(s => s.id === folder.id) ||
                                        summaries.find(s => folder.items && folder.items.includes(s.id)) ||
                                        summaries.find(s => s.id === (folder.items && folder.items[0]));

                                    if (isStatistics) {
                                        if (folder.mean) badgeList.push('평균');
                                        if (folder.median) badgeList.push('중앙값');
                                        if (folder.mode) badgeList.push('최빈값');
                                    } else {
                                        if (assocSummary && Array.isArray(assocSummary.info)) {
                                            assocSummary.info.forEach(item => {
                                                if (item.disabled) return;
                                                const isStatisticsItem = item.type === 'statistics' ||
                                                    item.type === 'mean' ||
                                                    item.mean === true ||
                                                    item.tag === 'mean' ||
                                                    item.value_id === 'mean' ||
                                                    item.tag === 'median' ||
                                                    item.tag === 'mode' ||
                                                    item.value_id === 'median' ||
                                                    item.value_id === 'mode';
                                                if (isStatisticsItem) {
                                                    const hasMean = item.mean === true || item.mean === 'true' || item.mean === 1 || item.mean === '1' || item.tag === 'mean' || item.value_id === 'mean';
                                                    const hasMedian = item.median === true || item.median === 'true' || item.median === 1 || item.median === '1' || item.tag === 'median' || item.value_id === 'median';
                                                    const hasMode = item.mode === true || item.mode === 'true' || item.mode === 1 || item.mode === '1' || item.tag === 'mode' || item.value_id === 'mode';

                                                    if (hasMean) badgeList.push('평균');
                                                    if (hasMedian) badgeList.push('중앙값');
                                                    if (hasMode) badgeList.push('최빈값');
                                                } else {
                                                    const tagLabel = item.tag || item.label || item.name;
                                                    if (tagLabel) {
                                                        const cleanLabel = tagLabel.replace(/\s*요약\s*$/, '').trim();
                                                        badgeList.push(cleanLabel);
                                                    }
                                                }
                                            });
                                        }

                                        if (badgeList.length === 0) {
                                            const codes = folder.include_codes || '';
                                            const hasTopCodes = codes.includes(String(scalePoints)) || codes.includes(String(scalePoints - 1));
                                            const hasBotCodes = codes.includes('1') || codes.includes('2');
                                            if (hasTopCodes) badgeList.push(`Top2`);
                                            if (hasBotCodes) badgeList.push(`Bot2`);
                                            if (folder.mean) badgeList.push('평균');
                                        }
                                    }


                                    const fromIdx = folders.findIndex(f => f.id === draggedFolderId);
                                    const toIdx = folders.findIndex(f => f.id === folder.id);

                                    const baseBorderColor = (newlyCreatedFolderIds.has(folder.id) || isExpanded) ? '#3b82f6' : '#e2e8f0';
                                    const baseBorderWidth = (newlyCreatedFolderIds.has(folder.id) || isExpanded) ? '1.5px' : '1px';
                                    const baseBorderStyle = 'solid';

                                    let customBorderTop = `${baseBorderWidth} ${baseBorderStyle} ${baseBorderColor}`;
                                    let customBorderBottom = `${baseBorderWidth} ${baseBorderStyle} ${baseBorderColor}`;
                                    const customBorderRight = `${baseBorderWidth} ${baseBorderStyle} ${baseBorderColor}`;
                                    const customBorderLeft = `${baseBorderWidth} ${baseBorderStyle} ${baseBorderColor}`;

                                    if (draggedFolderId && dragOverFolderId === folder.id) {
                                        if (fromIdx > toIdx) {
                                            customBorderTop = '3px solid #2563eb';
                                        } else if (fromIdx < toIdx) {
                                            customBorderBottom = '3px solid #2563eb';
                                        }
                                    }

                                    return (
                                        <div
                                            key={folder.id}
                                            draggable={dragEnabledFolderId === folder.id}
                                            onDragStart={(e) => handleFolderItemDragStart(e, folder.id)}
                                            onDragOver={(e) => handleFolderItemDragOver(e, folder.id)}
                                            onDragLeave={handleFolderItemDragLeave}
                                            onDrop={(e) => handleFolderItemDrop(e, folder.id)}
                                            onDragEnd={handleFolderItemDragEnd}
                                            style={{
                                                borderTop: customBorderTop,
                                                borderBottom: customBorderBottom,
                                                borderRight: customBorderRight,
                                                borderLeft: customBorderLeft,
                                                borderRadius: '6px',
                                                background: (newlyCreatedFolderIds.has(folder.id) || isExpanded) ? '#f0f9ff' : '#ffffff',
                                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                                                padding: '10px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                opacity: draggedFolderId === folder.id ? 0.4 : 1,
                                                transition: 'background-color 0.8s ease, border-color 0.8s ease'
                                            }}
                                        >

                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                <div
                                                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: '#94a3b8', marginRight: '6px' }}
                                                    onMouseDown={() => setDragEnabledFolderId(folder.id)}
                                                    onMouseUp={() => setDragEnabledFolderId(null)}
                                                    onMouseLeave={() => setDragEnabledFolderId(null)}
                                                >
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

                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                                            {folder.name}

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
                                                                    const lower = b.toLowerCase();

                                                                    let cleanB = b;
                                                                    if (lower.startsWith('top')) cleanB = 'Top' + b.slice(3);
                                                                    else if (lower.startsWith('bot')) cleanB = 'Bot' + b.slice(3);
                                                                    else if (lower.startsWith('mid')) cleanB = 'Mid' + b.slice(3);

                                                                    if (lower.includes('top')) { bg = '#eff6ff'; fg = '#3b82f6'; }
                                                                    else if (lower.includes('bot')) { bg = '#fff1f2'; fg = '#f43f5e'; }
                                                                    else if (lower.includes('mid')) { bg = '#fffbeb'; fg = '#d97706'; }
                                                                    else if (lower === '평균') { bg = '#ecfdf5'; fg = '#10b981'; }
                                                                    else if (lower === '중앙값') { bg = '#faf5ff'; fg = '#7c3aed'; }
                                                                    else if (lower === '최빈값') { bg = '#fffbeb'; fg = '#d97706'; }

                                                                    return (
                                                                        <span key={b} style={{ fontSize: '9px', fontWeight: 700, color: fg, background: bg, padding: '1px 5px', borderRadius: '3px' }}>
                                                                            {cleanB}
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
                                                            handleOpenEditModal(folder);
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                                            background: 'transparent', color: '#64748b', border: 'none', borderRadius: '6px',
                                                            cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'transparent';
                                                            e.currentTarget.style.color = '#64748b';
                                                        }}
                                                        title="요약 설정 수정"
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
                                                            setFolders(prev => {
                                                                const idx = prev.findIndex(f => f.id === folder.id);
                                                                if (idx === -1) return [...prev, newFolder];
                                                                const updated = [...prev];
                                                                updated.splice(idx + 1, 0, newFolder);
                                                                return updated;
                                                            });
                                                            if (onUnsavedChange) onUnsavedChange(true);
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                                            background: 'transparent', color: '#64748b', border: 'none', borderRadius: '6px',
                                                            cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#ecfdf5';
                                                            e.currentTarget.style.color = '#059669';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'transparent';
                                                            e.currentTarget.style.color = '#64748b';
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

                                                                            const deleteKey = folder.stub_id || folder.id;
                                                                            if (deleteKey && String(deleteKey).trim() !== "") {
                                                                                if (originalFolderIds.includes(folder.id) && !folder.id.startsWith('folder_')) {
                                                                                    const newDeletedIds = [...deletedSummaryIds, deleteKey];
                                                                                    setDeletedSummaryIds(newDeletedIds);
                                                                                    await handleSaveSummary(newFolders, newDeletedIds, '요약표가 삭제되었습니다.');
                                                                                } else {
                                                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                                                }
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
                                                            e.currentTarget.style.color = '#64748b';
                                                        }}
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ marginTop: (currentTab === 'scale' || currentTab === 'open-num') ? '8px' : '4px', borderTop: '1px solid #f1f5f9', paddingTop: (currentTab === 'scale' || currentTab === 'open-num') ? '4px' : '0px' }}>

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

                                                    {currentTab === 'scale' && (


                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px', padding: '0 4px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>포함 요약표 구성 (뱃지):</span>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                {assocSummary && Array.isArray(assocSummary.info) && assocSummary.info.map((item, idx) => {
                                                                    const isMean = (item.type === 'statistics' && item.mean) ||
                                                                        item.type === 'mean' ||
                                                                        item.mean === true ||
                                                                        item.tag === 'mean' ||
                                                                        item.value_id === 'mean';

                                                                    let b = '';
                                                                    if (isMean) {
                                                                        b = '평균';
                                                                    } else {
                                                                        const tagLabel = item.tag || item.label || item.name || '';
                                                                        b = tagLabel.replace(/\s*요약\s*$/, '').trim();
                                                                    }

                                                                    if (!b) return null;

                                                                    let bg = '#f1f5f9';
                                                                    let fg = '#64748b';
                                                                    let border = '1px solid #cbd5e1';
                                                                    const lower = b.toLowerCase();

                                                                    if (item.disabled) {
                                                                        bg = '#f8fafc';
                                                                        fg = '#94a3b8';
                                                                        border = '1px dashed #cbd5e1';
                                                                    } else {
                                                                        if (lower.includes('top')) { bg = '#eff6ff'; fg = '#3b82f6'; border = '1px solid #bfdbfe'; }
                                                                        else if (lower.includes('bot')) { bg = '#fff1f2'; fg = '#f43f5e'; border = '1px solid #fca5a5'; }
                                                                        else if (lower.includes('mid')) { bg = '#fffbeb'; fg = '#d97706'; border = '1px solid #fde68a'; }
                                                                        else if (lower === '평균') { bg = '#ecfdf5'; fg = '#10b981'; border = '1px solid #a7f3d0'; }
                                                                        else if (lower === '중앙값') { bg = '#faf5ff'; fg = '#7c3aed'; border = '1px solid #e9d5ff'; }
                                                                        else if (lower === '최빈값') { bg = '#fffbeb'; fg = '#d97706'; border = '1px solid #fde68a'; }
                                                                    }

                                                                    let cleanB = b;
                                                                    if (lower.startsWith('top')) cleanB = 'Top' + b.slice(3);
                                                                    else if (lower.startsWith('bot')) cleanB = 'Bot' + b.slice(3);
                                                                    else if (lower.startsWith('mid')) cleanB = 'Mid' + b.slice(3);

                                                                    return (
                                                                        <span
                                                                            key={`${b}_${idx}`}
                                                                            onClick={() => {
                                                                                setSummaries(prev => prev.map(s => {
                                                                                    const isTarget = s.id === folder.id ||
                                                                                        (folder.items && folder.items.includes(s.id));
                                                                                    if (isTarget) {
                                                                                        return {
                                                                                            ...s,
                                                                                            info: s.info.map((inner, innerIdx) => {
                                                                                                if (innerIdx === idx) {
                                                                                                    return { ...inner, disabled: !inner.disabled };
                                                                                                }
                                                                                                return inner;
                                                                                            })
                                                                                        };
                                                                                    }
                                                                                    return s;
                                                                                }));
                                                                                if (onUnsavedChange) onUnsavedChange(true);
                                                                            }}
                                                                            style={{
                                                                                fontSize: '10.5px',
                                                                                fontWeight: 600,
                                                                                padding: '3px 8px',
                                                                                borderRadius: '12px',
                                                                                color: fg,
                                                                                background: bg,
                                                                                border: border,
                                                                                userSelect: 'none',
                                                                                cursor: 'pointer',
                                                                                opacity: item.disabled ? 0.6 : 1,
                                                                                transition: 'all 0.15s ease-in-out'
                                                                            }}
                                                                        >
                                                                            {cleanB}
                                                                        </span>
                                                                    );
                                                                })
                                                                }
                                                            </div>
                                                        </div>


                                                    )}
                                                    {currentTab === 'open-num' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px', padding: '0 4px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>포함 요약표 구성 (뱃지):</span>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <span
                                                                    onClick={() => {
                                                                        const nextMean = !folder.mean;
                                                                        if (!nextMean && !folder.median && !folder.mode) {
                                                                            modal.showAlert('알림', '최소 하나 이상의 통계 옵션(평균/중앙값/최빈값)을 선택해 주세요.');
                                                                            return;
                                                                        }
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mean: nextMean } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                    style={{
                                                                        fontSize: '10.5px',
                                                                        fontWeight: 600,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '12px',
                                                                        color: folder.mean ? '#10b981' : '#94a3b8',
                                                                        background: folder.mean ? '#ecfdf5' : '#f8fafc',
                                                                        border: folder.mean ? '1px solid #a7f3d0' : '1px dashed #cbd5e1',
                                                                        userSelect: 'none',
                                                                        cursor: 'pointer',
                                                                        opacity: folder.mean ? 1 : 0.5,
                                                                        transition: 'all 0.15s ease-in-out'
                                                                    }}
                                                                >
                                                                    평균
                                                                </span>

                                                                <span
                                                                    onClick={() => {
                                                                        const nextMedian = !folder.median;
                                                                        if (!folder.mean && !nextMedian && !folder.mode) {
                                                                            modal.showAlert('알림', '최소 하나 이상의 통계 옵션(평균/중앙값/최빈값)을 선택해 주세요.');
                                                                            return;
                                                                        }
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, median: nextMedian } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                    style={{
                                                                        fontSize: '10.5px',
                                                                        fontWeight: 600,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '12px',
                                                                        color: folder.median ? '#7c3aed' : '#94a3b8',
                                                                        background: folder.median ? '#faf5ff' : '#f8fafc',
                                                                        border: folder.median ? '1px solid #e9d5ff' : '1px dashed #cbd5e1',
                                                                        userSelect: 'none',
                                                                        cursor: 'pointer',
                                                                        opacity: folder.median ? 1 : 0.5,
                                                                        transition: 'all 0.15s ease-in-out'
                                                                    }}
                                                                >
                                                                    중앙값
                                                                </span>

                                                                <span
                                                                    onClick={() => {
                                                                        const nextMode = !folder.mode;
                                                                        if (!folder.mean && !folder.median && !nextMode) {
                                                                            modal.showAlert('알림', '최소 하나 이상의 통계 옵션(평균/중앙값/최빈값)을 선택해 주세요.');
                                                                            return;
                                                                        }
                                                                        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, mode: nextMode } : f));
                                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                                    }}
                                                                    style={{
                                                                        fontSize: '10.5px',
                                                                        fontWeight: 600,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '12px',
                                                                        color: folder.mode ? '#d97706' : '#94a3b8',
                                                                        background: folder.mode ? '#fffbeb' : '#f8fafc',
                                                                        border: folder.mode ? '1px solid #fde68a' : '1px dashed #cbd5e1',
                                                                        userSelect: 'none',
                                                                        cursor: 'pointer',
                                                                        opacity: folder.mode ? 1 : 0.5,
                                                                        transition: 'all 0.15s ease-in-out'
                                                                    }}
                                                                >
                                                                    최빈값
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(currentTab === 'scale' || currentTab === 'open-num') && (
                                                        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '6px 0 10px 0' }} />
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '0 4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>상세 변수 및 교차표 문구 매핑</span>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, userSelect: 'none' }}>
                                                                💡 입력창 중 하나를 선택해 엑셀 열을 붙여넣기(Ctrl+V)하면 아래로 자동 채워집니다.
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleOpenBulkItemLabelModal(folder.id)}
                                                            style={{
                                                                height: '28px', padding: '0 12px', fontSize: '11.5px', fontWeight: 600,
                                                                background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                cursor: 'pointer', transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        >
                                                            교차표 문구 일괄 편집
                                                        </button>
                                                    </div>

                                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                                                            <thead>
                                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                                                                    <th style={{ padding: '10px 14px', textAlign: 'left', width: '200px', fontSize: '11.5px', color: '#475569' }}>변수 ID</th>
                                                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11.5px', color: '#475569' }}>교차표 문구</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {folder.type === 'statistics' ? (
                                                                    (() => {
                                                                        const hasMean = folder.mean === true;
                                                                        const hasMedian = folder.median === true;
                                                                        const hasMode = folder.mode === true;

                                                                        const activeStats = [];
                                                                        const itemId = folder.items && folder.items[0];

                                                                        if (itemId) {
                                                                            if (hasMean) {
                                                                                const meanLabel = summaries.find(s => s.id === itemId + '_mean')?.label ?? 'mean';
                                                                                activeStats.push({ key: 'mean', label: meanLabel, virtualId: itemId + '_mean' });
                                                                            }
                                                                            if (hasMedian) {
                                                                                const medianLabel = summaries.find(s => s.id === itemId + '_median')?.label ?? 'median';
                                                                                activeStats.push({ key: 'median', label: medianLabel, virtualId: itemId + '_median' });
                                                                            }
                                                                            if (hasMode) {
                                                                                const modeLabel = summaries.find(s => s.id === itemId + '_mode')?.label ?? 'mode';
                                                                                activeStats.push({ key: 'mode', label: modeLabel, virtualId: itemId + '_mode' });
                                                                            }
                                                                        }

                                                                        if (activeStats.length === 0 && itemId) {
                                                                            const meanLabel = summaries.find(s => s.id === itemId + '_mean')?.label ?? 'mean';
                                                                            activeStats.push({ key: 'mean', label: meanLabel, virtualId: itemId + '_mean' });
                                                                        }

                                                                        return activeStats.map((stat) => (
                                                                            <tr key={stat.key} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                                                                                    <span style={{
                                                                                        display: 'inline-block',
                                                                                        padding: '3px 8px',
                                                                                        background: '#f1f5f9',
                                                                                        color: '#475569',
                                                                                        borderRadius: '6px',
                                                                                        fontWeight: 600,
                                                                                        fontFamily: 'monospace',
                                                                                        fontSize: '11px',
                                                                                        border: '1px solid #e2e8f0'
                                                                                    }}>
                                                                                        {stat.key}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: '8px 14px' }}>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={stat.label}
                                                                                        onChange={(e) => {
                                                                                            setSummaries(prev => {
                                                                                                const exists = prev.some(s => s.id === stat.virtualId);
                                                                                                if (exists) {
                                                                                                    return prev.map(s => s.id === stat.virtualId ? { ...s, label: e.target.value } : s);
                                                                                                } else {
                                                                                                    return [
                                                                                                        ...prev,
                                                                                                        {
                                                                                                            id: stat.virtualId,
                                                                                                            label: e.target.value,
                                                                                                            subId: stat.virtualId,
                                                                                                            type: 'statistics',
                                                                                                            info: []
                                                                                                        }
                                                                                                    ];
                                                                                                }
                                                                                            });
                                                                                            if (onUnsavedChange) onUnsavedChange(true);
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.08)';
                                                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                                                        }}
                                                                                        onBlur={(e) => {
                                                                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                                                                            e.currentTarget.style.boxShadow = 'none';
                                                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                                                        }}
                                                                                        style={{
                                                                                            width: '100%',
                                                                                            padding: '6px 12px',
                                                                                            border: '1px solid #e2e8f0',
                                                                                            borderRadius: '6px',
                                                                                            outline: 'none',
                                                                                            color: '#1e293b',
                                                                                            fontSize: '11.5px',
                                                                                            background: '#ffffff',
                                                                                            transition: 'all 0.15s ease-in-out'
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        ));
                                                                    })()
                                                                ) : (
                                                                    folder.items.map((itemId, idx) => {
                                                                        const varInfo = summaries.find(s => s.id === itemId);
                                                                        const baseVar = baseVariables.find(v => v.id === itemId || v.base_id === itemId);
                                                                        const showLabel = baseVar ? baseVar.label || baseVar.name : '';
                                                                        const labelValue = (() => {
                                                                            let val = varInfo ? varInfo.label : showLabel;
                                                                            if (varInfo && folder && folder.name) {
                                                                                const isCorrupted = varInfo.label === folder.name ||
                                                                                    varInfo.label.includes('요약표') ||
                                                                                    varInfo.label.includes('(평균)') ||
                                                                                    varInfo.label.includes('(Top') ||
                                                                                    varInfo.label.includes('(Bot') ||
                                                                                    varInfo.label.includes('(Mid');
                                                                                if (isCorrupted) {
                                                                                    val = showLabel;
                                                                                }
                                                                            }
                                                                            return val;
                                                                        })();
                                                                        return (
                                                                            <tr key={itemId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                                                                                    <span style={{
                                                                                        display: 'inline-block',
                                                                                        padding: '3px 8px',
                                                                                        background: '#f1f5f9',
                                                                                        color: '#475569',
                                                                                        borderRadius: '6px',
                                                                                        fontWeight: 600,
                                                                                        fontFamily: 'monospace',
                                                                                        fontSize: '11px',
                                                                                        border: '1px solid #e2e8f0'
                                                                                    }}>
                                                                                        {itemId}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: '8px 14px' }}>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={labelValue}
                                                                                        onChange={(e) => {
                                                                                            setSummaries(prev => {
                                                                                                const exists = prev.some(s => s.id === itemId);
                                                                                                if (exists) {
                                                                                                    return prev.map(s => s.id === itemId ? { ...s, label: e.target.value } : s);
                                                                                                } else {
                                                                                                    return [
                                                                                                        ...prev,
                                                                                                        {
                                                                                                            id: itemId,
                                                                                                            label: e.target.value,
                                                                                                            subId: itemId,
                                                                                                            type: baseVar?.type || 'frequency',
                                                                                                            info: baseVar?.info || baseVar?.categories || []
                                                                                                        }
                                                                                                    ];
                                                                                                }
                                                                                            });
                                                                                            if (onUnsavedChange) onUnsavedChange(true);
                                                                                        }}
                                                                                        onPaste={(e) => handlePasteLabels(e, idx, folder.items)}
                                                                                        onFocus={(e) => {
                                                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.08)';
                                                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                                                        }}
                                                                                        onBlur={(e) => {
                                                                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                                                                            e.currentTarget.style.boxShadow = 'none';
                                                                                            e.currentTarget.style.backgroundColor = '#fdfdfd';
                                                                                        }}
                                                                                        style={{
                                                                                            width: '100%',
                                                                                            padding: '6px 12px',
                                                                                            border: '1px solid #e2e8f0',
                                                                                            borderRadius: '6px',
                                                                                            outline: 'none',
                                                                                            color: '#1e293b',
                                                                                            fontSize: '11.5px',
                                                                                            background: '#fdfdfd',
                                                                                            transition: 'all 0.15s ease-in-out'
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                </div>
                                            )}

                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1,
                                    color: '#94a3b8',
                                    fontSize: '13.5px',
                                    fontWeight: 500,
                                    userSelect: 'none'
                                }}>
                                    등록된 요약표가 없습니다.
                                </div>
                            )}</div>
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
                        backgroundColor: '#ffffff', borderRadius: '16px', width: '750px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
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
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>요약표 일괄 자동 생성</h3>
                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                                        {wizardTab === 'scale'
                                            ? '감지된 모든 척도형 문항(Scale) 묶음에 대해 지정한 밴드 조합과 평균 포함 여부에 따라 요약표를 일괄 구성합니다.'
                                            : '오픈/숫자형(open(숫자)) 문항들에 대해 선택한 통계 요약표를 일괄적으로 구성하여 생성 제안합니다.'
                                        }
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsWizardOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 모달 콘텐츠 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>

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
                                                        onChange={() => toggleWizardProposalSelect(prop.id)}
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
                            padding: '14px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setIsWizardOpen(false)}
                                style={{
                                    height: '38px', padding: '0 20px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1',
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
                                    height: '38px', padding: '0 24px', fontSize: '13px', borderRadius: '6px', border: 'none',
                                    background: '#3b82f6', color: '#ffffff',
                                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#3b82f6'; }}
                            >
                                <span>{wizardSelectedIds.size}개 생성 목록 추가</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 요약표 수동 생성 설정 모달 */}
            {isManualModalOpen && (
                <DpRequestManualSummaryModal
                    mode={manualModalMode}
                    editingFolder={editingFolder}
                    selectedIds={activeTabSelectedIds}
                    currentTab={currentTab}
                    scalePresets={scalePresets}
                    summaries={summaries}
                    summaryVariables={summaryVariables}
                    onClose={() => setIsManualModalOpen(false)}
                    onConfirm={handleConfirmManualSummary}
                />
            )}

            {/* 요약표 제목 일괄 편집 모달 */}
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
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>요약표 제목 일괄 편집</h3>
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
                                    {modalFolders.map((folder) => (
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
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', width: '750px',
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
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>교차표 문구 일괄 수정</h3>
                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>현재 요약표에 속한 변수들의 교차표 문구 목록입니다. 줄바꿈 단위로 편집하거나, 엑셀 열 데이터를 복사해서 붙여넣으면 일괄 반영됩니다.
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsBulkItemLabelModalOpen(false); setActiveBulkItemFolderId(null); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 모달 콘텐츠 */}
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff' }}>
                            <textarea
                                value={bulkItemLabelText}
                                onChange={(e) => setBulkItemLabelText(e.target.value)}
                                style={{
                                    width: '100%', height: '380px', padding: '16px', border: '1px solid #cbd5e1',
                                    borderRadius: '8px', fontSize: '14.5px', outline: 'none', resize: 'none',
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
                                placeholder="교차표 문구 1&#10;교차표 문구 2&#10;교차표 문구 3"
                            />
                        </div>

                        {/* 팝업 푸터 */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '8px',
                            padding: '14px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => { setIsBulkItemLabelModalOpen(false); setActiveBulkItemFolderId(null); }}
                                style={{
                                    height: '38px', padding: '0 20px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1',
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
                                    height: '38px', padding: '0 24px', fontSize: '13px', borderRadius: '6px', border: 'none',
                                    background: '#3b82f6', color: '#ffffff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#3b82f6'; }}
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

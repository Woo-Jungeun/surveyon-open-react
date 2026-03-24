import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import MapManagementPageModal from './MapManagementPageModal';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { MapManagementContext, EDITABLE_FIELDS, recalcVariables } from './MapManagementUtils';
import MapConfigTab from './MapConfigTab';
import ViewLabelTab from './ViewLabelTab';
import AddLabelPopup from './AddLabelPopup';
import LogicEditPopup from './LogicEditPopup';
import MapConfigFilterPopup from '../../../../components/common/popup/MapConfigFilterPopup';
import DownloadModal from './DownloadModal';
import UploadModal from './UploadModal';
import DataUpdateModal from './DataUpdateModal';
import { Download, Upload } from 'lucide-react';

import '../../../../assets/css/grid_vertical_borders.css';
import './MapManagementPage.css';

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
const MapManagementPage = () => {
    const { getMapVariables, srtTransfer, createMapVariables, updateMapVariables, updateMapLabels, createMapLabels } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const modal = React.useContext(modalContext);
    const loadingSpinner = React.useContext(loadingSpinnerContext);

    // ── 상태 선언 ──
    const [variables, setVariables] = useState([]);           // 현재 그리드 데이터
    const [originalVariables, setOriginalVariables] = useState([]); // 조회 시점 원본 (변경 감지용)
    const [deletedIds, setDeletedIds] = useState([]);         // 삭제된 기존 변수 id 목록
    const [isDataLoaded, setIsDataLoaded] = useState(false);  // 초기 데이터 로드 완료 여부
    const [refreshKey, setRefreshKey] = useState(0);          // 재조회 트리거

    const [activeTab, setActiveTab] = useState('mapping');    // 'mapping' | 'category'
    const [isDetailed, setIsDetailed] = useState(false);      // 상세 설정 토글
    const [selectedVariableId, setSelectedVariableId] = useState(null); // 보기 레이블 탭에서 선택된 변수 id
    const [editingRowId, setEditingRowId] = useState(null);   // 현재 편집 중인 행 id

    const [sidebarSearchQuery, setSidebarSearchQuery] = useState(''); // 변수 목록 검색어

    const [editingCategoryPopupOpen, SetEditingCategoryPopupOpen] = useState(null); // 보기 변경 팝업
    const [editingLogicPopupOpen, setEditingLogicPopupOpen] = useState(null);       // 로직 변경 팝업
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);              // 다운로드 모달 상태
    const [uploadModalOpen, setUploadModalOpen] = useState(false);                  // 업로드 모달 상태
    const [dataUpdateModalOpen, setDataUpdateModalOpen] = useState(false);          // 데이터 업데이트 모달 상태
    const [addValueModalOpen, setAddValueModalOpen] = useState(false);              // 레이블 추가 팝업 상태

    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [skip, setSkip] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    // ── 변경 감지 최적화 ──
    const originalMap = useMemo(() => {
        return new Map(originalVariables.map(v => [v.id, v]));
    }, [originalVariables]);

    const hasChanges = useMemo(() => {
        if (!isDataLoaded) return false;
        if (deletedIds.length > 0) return true;
        if (variables.some(v => v.isNew)) return true;

        // variables와 originalVariables의 개수가 다르면 (신규 추가 등) 변경 있음
        if (variables.length !== originalVariables.length) return true;

        return variables.some(v => {
            const orig = originalMap.get(v.id);
            if (!orig) return true;
            // 필드 비교 (최적화: 루프 대신 명시적 비교가 빠를 수 있으나, 가독성을 위해 maintain)
            return EDITABLE_FIELDS.some(f => v[f] !== orig[f]);
        });
    }, [variables, originalMap, deletedIds, isDataLoaded]);

    const loadData = async () => {
        if (!auth?.user?.userId) return;
        const userId = auth.user.userId;
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        if (!pn) {
            setIsDataLoaded(true);
            return;
        }

        try {
            loadingSpinner.show();
            const result = await getMapVariables.mutateAsync({ user: userId, pn });

            if (result?.success === "777" && result?.resultjson?.variables) {
                const transformedData = result.resultjson.variables.map(item => {
                    const categoryStr = (item.labels || [])
                        .map(l => `${l.code}=${l.label}`)
                        .join(', ');

                    return {
                        id: item.id,
                        sysName: item.cQuestionVariable || '',
                        name: item.cQuestionVariable || '',
                        label: item.label || '',
                        type: (item.type || 'single').toLowerCase(),
                        startPos: item.startPos || 0,
                        valLen: item.codeLen || 0,
                        valCnt: item.optCount || 0,
                        totalLen: item.totalLen || 0,
                        etcOpen: item.openRule || '',
                        logic: item.logicCheck || '',
                        spssName: item.spssName || '',
                        decimal: item.decimalPlaces || 0,
                        memo: item.memo || '',
                        multiValChange: !!item.multiChange,
                        minQuestions: item.minAnswer || 0,
                        excludeOpenMerge: !!item.noOpenMerge,
                        verificationVar: !!item.isValid,
                        excludeOutput: !!item.noOutput,
                        category: categoryStr,
                        labels: item.labels || [],
                        ranking: item.ranking || 0,
                        isBaked: (item.type || '').toLowerCase() === 'custom' ? false : !!item.isBaked
                    };
                });

                const allZero = transformedData.every(v => v.startPos === 0);
                const finalData = allZero ? recalcVariables(transformedData) : transformedData;

                setVariables(finalData);
                setOriginalVariables(JSON.parse(JSON.stringify(finalData)));
            } else if (result?.success !== "777") {
                const errorMsg = result?.errortext || result?.errorcontent || result?.message || "프로젝트 매핑 정보를 조회할 수 없습니다.";
                modal.showErrorAlert("에러", errorMsg);
                setVariables([]);
                setOriginalVariables([]);
            } else {
                setVariables([]);
                setOriginalVariables([]);
            }
        } catch (error) {
            console.error("맵 변수 조회 오류:", error);
            setVariables([]);
            setOriginalVariables([]);
            if (error?.response?.status === 404) {
                modal.showErrorAlert("알림", "프로젝트를 찾을 수 없습니다.");
            } else if (error?.response?.status === 400) {
                modal.showErrorAlert("알림", "잘못된 요청입니다.");
            } else {
                modal.showErrorAlert("에러", "맵 목록 조회 중 오류가 발생했습니다.");
            }
        } finally {
            setIsDataLoaded(true);
            loadingSpinner.hide();
        }
    };

    // ── 데이터 조회 ──
    useEffect(() => {
        loadData();
    }, [auth?.user?.userId, refreshKey]);

    useEffect(() => {
        const handlePageSelected = () => setRefreshKey(prev => prev + 1);
        window.addEventListener("pageSelected", handlePageSelected);
        return () => window.removeEventListener("pageSelected", handlePageSelected);
    }, []);

    useEffect(() => {
        if (activeTab === 'category') {
            if (variables.length > 0 && !selectedVariableId) {
                setSelectedVariableId(variables[0].id);
            }
        } else {
            setSelectedVariableId(null);
            setSidebarSearchQuery('');
        }
    }, [activeTab, variables]);

    const selectedVariable = variables.find(v => v.id === selectedVariableId) ?? null;

    // ── 핸들러 ──
    const pageChange = (event) => {
        setSkip(event.page.skip);
        setPageSize(event.page.take);
    };

    const handleCategorySave = (id, newCategoryStr) => {
        setVariables(variables.map(v => v.id === id ? { ...v, category: newCategoryStr } : v));
        SetEditingCategoryPopupOpen(null);
    };

    const handleLogicSave = (id, newLogicStr, info) => {
        setVariables(variables.map(v => v.id === id ? { ...v, logic: newLogicStr, logicInfo: info } : v));
        setEditingLogicPopupOpen(null);
    };

    const handleAddValueSave = (newLabels) => {
        if (!selectedVariableId) return;

        const newCategoryStr = newLabels.map(l => `{${l.code};${l.label}}`).join('');

        setVariables(variables.map(v => {
            if (v.id !== selectedVariableId) return v;

            const existingLabels = v.labels || [];
            const existingLabelsMap = new Map();
            existingLabels.forEach(l => existingLabelsMap.set(l.code, l));

            const mergedLabels = newLabels.map(nl => {
                const existing = existingLabelsMap.get(nl.code);
                if (existing) {
                    return { ...existing, label: nl.label };
                }
                return nl;
            });

            const newCategoryStr = mergedLabels.map(l => `{${l.code};${l.label}}`).join('');
            return { ...v, labels: mergedLabels, category: newCategoryStr };
        }));

        setAddValueModalOpen(false);
    };

    const handleDeleteLabel = (codeToRemove) => {
        if (!selectedVariableId) return;
        const currentLabels = selectedVariable?.labels || [];
        const newLabels = currentLabels.filter(l => l.code !== codeToRemove);
        const newCategoryStr = newLabels.map(l => `{${l.code};${l.label}}`).join('');

        setVariables(variables.map(v =>
            v.id === selectedVariableId
                ? { ...v, labels: newLabels, category: newCategoryStr }
                : v
        ));
    };

    const handleDeleteVariable = (id) => {
        const isNew = variables.find(v => v.id === id)?.isNew;
        if (!isNew) {
            setDeletedIds(prev => [...prev, id]);
        }
        setVariables(prev => prev.filter(v => v.id !== id));
    };

    const handleAddVariable = (afterId) => {
        setVariables(prev => {
            const newId = Date.now();
            let counter = 1;
            while (prev.some(v => v.sysName === `var_${counter}`)) counter++;
            const newName = `var_${counter}`;

            const newRow = {
                id: newId,
                sysName: newName,
                name: newName,
                label: '',
                category: '',
                logic: '',
                count: '0 / 0',
                type: '범주형',
                isNew: true
            };

            // afterId가 있으면 해당 행 바로 아래에 삽입, 없으면 맨 위
            if (afterId != null) {
                const idx = prev.findIndex(v => v.id === afterId);
                if (idx !== -1) {
                    const next = [...prev];
                    next.splice(idx + 1, 0, newRow);
                    return next;
                }
            }
            return [newRow, ...prev];
        });
    };



    const executeSave = async (showSuccessModal = true) => {
        try {
            const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
            const userId = auth?.user?.userId || '';

            if (activeTab === 'category') {
                const originalMap = new Map(originalVariables.map(v => [v.id, v]));
                const variablesWithLabelChanges = variables.filter(v => {
                    if (v.isNew) return false;
                    const orig = originalMap.get(v.id);
                    if (!orig) return false;
                    return JSON.stringify(v.labels || []) !== JSON.stringify(orig.labels || []);
                });

                if (variablesWithLabelChanges.length === 0) {
                    if (showSuccessModal) modal.showAlert("알림", "변경된 데이터가 없습니다.", () => { });
                    return true;
                }

                let allSuccess = true;

                for (const v of variablesWithLabelChanges) {
                    const origLabels = originalMap.get(v.id)?.labels || [];
                    const currentLabels = v.labels || [];

                    const currentCodesSet = new Set(currentLabels.map(l => l.code));
                    const deletedLabelIds = origLabels
                        .filter(l => !currentCodesSet.has(l.code))
                        .map(l => l.id)
                        .filter(id => id != null);

                    const origLabelsMap = new Map(origLabels.map(l => [l.code, l]));
                    const updatedLabelPayloads = [];
                    const createdLabelPayloads = [];

                    currentLabels.forEach((l, index) => {
                        const orig = origLabelsMap.get(l.code);
                        const rankingVal = l.ranking !== undefined ? l.ranking : (orig?.ranking !== undefined ? orig.ranking : index + 1);

                        const isOpenVal = l.isOpen !== undefined ? l.isOpen : false;
                        const lenNumVal = l.lenNum || 0;
                        const isNumVal = l.isNum !== undefined ? l.isNum : false;

                        if (l.id) {
                            const isChanged = !orig ||
                                orig.label !== l.label ||
                                (orig.isOpen || false) !== isOpenVal ||
                                (orig.lenNum || 0) !== lenNumVal ||
                                (orig.isNum || false) !== isNumVal ||
                                (orig.ranking !== undefined ? orig.ranking : index + 1) !== rankingVal;

                            if (isChanged) {
                                updatedLabelPayloads.push({
                                    id: l.id,
                                    pn: l.pn || pn,
                                    variableId: v.id,
                                    code: l.code,
                                    label: l.label,
                                    isOpen: isOpenVal,
                                    lenNum: lenNumVal,
                                    isNum: isNumVal,
                                    ranking: rankingVal,
                                    createdAt: l.createdAt || new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                });
                            }
                        } else {
                            createdLabelPayloads.push({
                                id: 0,
                                code: l.code,
                                label: l.label,
                                isOpen: isOpenVal,
                                lenNum: lenNumVal,
                                isNum: isNumVal,
                                ranking: rankingVal
                            });
                        }
                    });

                    // Update/Delete labels
                    if (updatedLabelPayloads.length > 0 || deletedLabelIds.length > 0) {
                        const payload = {
                            variableId: v.id,
                            user: userId,
                            updated: updatedLabelPayloads,
                            deleted: deletedLabelIds
                        };
                        const saveResult = await updateMapLabels.mutateAsync(payload);
                        if (!(saveResult?.success === '777' || saveResult?.success === true)) {
                            allSuccess = false;
                            const errorMsg = saveResult?.errortext || saveResult?.errorcontent || saveResult?.message;
                            if (errorMsg) {
                                modal.showErrorAlert("에러", errorMsg);
                                return false;
                            }
                        }
                    }

                    // Create new labels
                    if (createdLabelPayloads.length > 0) {
                        const createPayload = {
                            variableId: v.id,
                            user: userId,
                            labels: createdLabelPayloads
                        };
                        const createResult = await createMapLabels.mutateAsync(createPayload);
                        if (!(createResult?.success === '777' || createResult?.success === true)) {
                            allSuccess = false;
                            const errorMsg = createResult?.errortext || createResult?.errorcontent || createResult?.message;
                            if (errorMsg) {
                                modal.showErrorAlert("에러", errorMsg);
                                return false;
                            }
                        }
                    }
                }

                if (allSuccess) {
                    await loadData();
                    if (showSuccessModal) modal.showAlert("알림", "보기 레이블 정보가 저장되었습니다.");
                    return true;
                } else {
                    modal.showErrorAlert("에러", "일부 보기 레이블 저장 중 에러가 발생했습니다.");
                    return false;
                }
            }

            const originalMap = new Map(originalVariables.map(v => [v.id, v]));

            // 신규 행과 수정된 기존 행 분리
            const newRows = variables.filter(v => v.isNew);
            const modifiedRows = variables.filter(v => {
                if (v.isNew) return false;
                const orig = originalMap.get(v.id);
                if (!orig) return false;
                return EDITABLE_FIELDS.some(f => v[f] !== orig[f]);
            });

            const toPayload = (v, isNew) => ({
                id: isNew ? 0 : v.id,
                projectId: 0,
                pn,
                sQuestionVariable: v.sysName || '',
                cQuestionVariable: v.name || v.sysName || '',
                label: v.label || '',
                type: v.type || '',
                startPos: v.startPos || 0,
                codeLen: v.valLen || 0,
                optCount: v.valCnt || 0,
                totalLen: v.totalLen || 0,
                openRule: v.etcOpen || '',
                logicCheck: v.logic || '',
                spssName: v.spssName || '',
                decimalPlaces: v.decimal || 0,
                memo: v.memo || '',
                multiChange: !!v.multiValChange,
                minAnswer: v.minQuestions || 0,
                noOpenMerge: !!v.excludeOpenMerge,
                isValid: !!v.verificationVar,
                noOutput: !!v.excludeOutput,
                ranking: v.ranking || 0,
                isBaked: !!v.isBaked,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                labels: v.labels || []
            });

            let createSuccess = true;
            let updateSuccess = true;

            // 신규 행: create API 호출
            if (newRows.length > 0) {
                const createPayload = {
                    pn,
                    user: userId,
                    variables: newRows.map(v => toPayload(v, true)),
                };
                const createResult = await createMapVariables.mutateAsync(createPayload);
                if (createResult?.success !== '777') {
                    createSuccess = false;
                    const errorMsg = createResult?.errortext || createResult?.errorcontent || createResult?.message;
                    if (errorMsg) {
                        modal.showErrorAlert("에러", errorMsg);
                        return false;
                    }
                }
            }

            // 수정된 기존 행 + 삭제: update API 호출
            if (modifiedRows.length > 0 || deletedIds.length > 0) {
                const updatePayload = {
                    pn,
                    user: userId,
                    updated: modifiedRows.map(v => toPayload(v, false)),
                    deleted: deletedIds,
                };
                const updateResult = await updateMapVariables.mutateAsync(updatePayload);
                if (!(updateResult?.success === '777' || updateResult?.success === true)) {
                    updateSuccess = false;
                    const errorMsg = updateResult?.errortext || updateResult?.errorcontent || updateResult?.message;
                    if (errorMsg) {
                        modal.showErrorAlert("에러", errorMsg);
                        return false;
                    }
                }
            }

            if (createSuccess && updateSuccess) {
                setDeletedIds([]);
                await loadData();
                if (showSuccessModal) modal.showAlert("알림", "저장되었습니다.");
                return true;
            } else {
                modal.showErrorAlert("에러", "저장에 실패했습니다.");
                return false;
            }
        } catch (e) {
            console.error('저장 오류:', e);
            modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
            return false;
        }
    };

    const handleSave = () => {
        modal.showConfirm("알림", "변경사항을 저장하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                { title: "확인", click: () => executeSave(true) },
            ]
        });
    };

    const handleTabChange = async (targetTab) => {
        if (targetTab === activeTab) return;

        if (hasChanges) {
            const action = await new Promise((resolve) => {
                modal.showConfirm("알림", "저장하지 않은 변경 사항이 있습니다.\n이동하시겠습니까?", {
                    btns: [
                        { title: "취소", click: () => resolve("cancel") },
                        { title: "이동", click: () => resolve("go") },
                        { title: "저장 후 이동", click: () => resolve("saveThenGo") }
                    ]
                });
            });

            if (action === "cancel") {
                return;
            } else if (action === "go") {
                // 변경 무시: 원본 데이터로 되돌림
                setVariables(originalVariables.map(v => ({ ...v })));
                setDeletedIds([]);
                setSelectedVariableId(null);
                setSidebarSearchQuery('');
                setActiveTab(targetTab);
                if (targetTab === 'mapping') setRefreshKey(prev => prev + 1);
            } else if (action === "saveThenGo") {
                const success = await executeSave(false);
                console.log(success) //todo 아직 에러코드 적용 X
                //if (success) {
                setSelectedVariableId(null);
                setSidebarSearchQuery('');
                setActiveTab(targetTab);
                if (targetTab === 'mapping') setRefreshKey(prev => prev + 1);
                // }
            }
        } else {
            setActiveTab(targetTab);
            if (targetTab === 'mapping') setRefreshKey(prev => prev + 1);
        }
    };

    const moveVariable = useCallback((fromIndex, toIndex) => {
        setVariables(prev => {
            const newVariables = [...prev];
            const [moved] = newVariables.splice(fromIndex, 1);
            newVariables.splice(toIndex, 0, moved);
            return recalcVariables(newVariables);
        });
    }, []);

    // ── Context 값 ──
    const contextValue = useMemo(() => ({
        variables,
        setVariables,
        editingRowId,
        setEditingRowId,
        SetEditingCategoryPopupOpen,
        setEditingLogicPopupOpen,
        isDetailed,
        onAdd: handleAddVariable,
        onDelete: handleDeleteVariable,
        moveVariable
    }), [variables, editingRowId, isDetailed, handleAddVariable, handleDeleteVariable, moveVariable]);

    // ── 렌더 ──
    return (
        <MapManagementContext.Provider value={contextValue}>
            <div className="variable-page" data-theme="data-management">
                <DataHeader
                    title="맵 관리"
                    saveButtonLabel="변경사항 저장"
                    onSave={handleSave}
                    saveButtonDisabled={!hasChanges}
                >
                    {activeTab === 'mapping' && (
                        <>
                            {!(sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '').toLowerCase().startsWith('q') && (
                                <>
                                    <button
                                        className="data-header-btn"
                                        onClick={() => setDataUpdateModalOpen(true)}
                                        style={{
                                            height: '38px',
                                            padding: '0 20px',
                                            border: '1px solid #16a34a',
                                            background: '#fff',
                                            color: '#16a34a',
                                            marginRight: '8px'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f0faf5'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                    >
                                        <Upload size={16} />
                                        데이터 업데이트
                                    </button>
                                    <button
                                        className="data-header-btn"
                                        onClick={() => setUploadModalOpen(true)}
                                        style={{
                                            height: '38px',
                                            padding: '0 20px',
                                            border: '1px solid #16a34a',
                                            background: '#fff',
                                            color: '#16a34a',
                                            marginRight: '8px'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f0faf5'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                    >
                                        <Upload size={16} />
                                        업로드
                                    </button>
                                </>
                            )}
                            <button
                                className="data-header-btn"
                                onClick={() => setDownloadModalOpen(true)}
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    border: '1px solid #16a34a',
                                    background: '#fff',
                                    color: '#16a34a',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f0faf5'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                                <Download size={16} />
                                다운로드
                            </button>
                        </>
                    )}
                </DataHeader>


                <div className="variable-page-content">
                    {/* 탭 버튼 */}
                    <div className="tab-container">
                        <button
                            className={`tab-btn ${activeTab === 'mapping' ? 'active' : ''}`}
                            onClick={() => handleTabChange('mapping')}
                        >
                            MAP 구성
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
                            onClick={() => handleTabChange('category')}
                        >
                            보기 레이블
                        </button>
                    </div>

                    {activeTab === 'mapping' ? (
                        <MapConfigTab
                            variables={variables}
                            isDetailed={isDetailed}
                            setIsDetailed={setIsDetailed}
                            sort={sort}
                            filter={filter}
                            setSort={setSort}
                            setFilter={setFilter}
                            skip={skip}
                            pageSize={pageSize}
                            pageChange={pageChange}
                            setEditingRowId={setEditingRowId}
                        />
                    ) : (
                        <ViewLabelTab
                            variables={variables}
                            sidebarSearchQuery={sidebarSearchQuery}
                            setSidebarSearchQuery={setSidebarSearchQuery}
                            selectedVariableId={selectedVariableId}
                            setSelectedVariableId={setSelectedVariableId}
                            selectedVariable={selectedVariable}
                            SetEditingCategoryPopupOpen={SetEditingCategoryPopupOpen}
                            setAddValueModalOpen={setAddValueModalOpen}
                            handleDeleteLabel={handleDeleteLabel}
                        />
                    )}
                </div>

                {/* 기존 보기(카테고리) 편집 팝업 */}
                {editingCategoryPopupOpen && (
                    <MapManagementPageModal
                        variable={editingCategoryPopupOpen}
                        onClose={() => SetEditingCategoryPopupOpen(null)}
                        onSave={handleCategorySave}
                    />
                )}

                {/* 로직 편집 팝업 */}
                {editingLogicPopupOpen && (
                    <MapConfigFilterPopup
                        auth={auth}
                        pageId={sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum')}
                        initialVariables={[]}
                        variablesList={variables}
                        initialLogic={editingLogicPopupOpen.logic}
                        initialInfo={editingLogicPopupOpen.logicInfo}
                        title={`로직 검수 설정 - ${editingLogicPopupOpen?.sysName || editingLogicPopupOpen?.title || editingLogicPopupOpen?.id}`}
                        onClose={() => setEditingLogicPopupOpen(null)}
                        onSave={(varId, logicStr, varLabel, info) => {
                            handleLogicSave(editingLogicPopupOpen.id, logicStr, info);
                        }}
                    />
                )}

                {/* 레이블 팝업 (textarea) */}
                <AddLabelPopup
                    isOpen={addValueModalOpen}
                    onClose={() => setAddValueModalOpen(false)}
                    onSave={handleAddValueSave}
                    initialLabels={selectedVariable?.labels}
                />

                {/* 다운로드 모달 */}
                <DownloadModal
                    isOpen={downloadModalOpen}
                    onClose={() => setDownloadModalOpen(false)}
                />

                {/* 업로드 모달 */}
                <UploadModal
                    isOpen={uploadModalOpen}
                    onClose={() => setUploadModalOpen(false)}
                    refreshData={() => setRefreshKey(prev => prev + 1)}
                />

                {/* 데이터 업데이트 모달 */}
                <DataUpdateModal
                    isOpen={dataUpdateModalOpen}
                    onClose={() => setDataUpdateModalOpen(false)}
                    refreshData={() => setRefreshKey(prev => prev + 1)}
                />
            </div>
        </MapManagementContext.Provider>
    );
};

export default MapManagementPage;

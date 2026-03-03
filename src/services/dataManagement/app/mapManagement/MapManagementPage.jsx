import React, { useState, useEffect, useMemo } from 'react';
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

import '../../../../assets/css/grid_vertical_borders.css';
import './MapManagementPage.css';

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
const MapManagementPage = () => {
    const { getMapVariables, updateMapVariables } = MapManagementPageApi();
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
    const [addValueModalOpen, setAddValueModalOpen] = useState(false);        // 레이블 추가 팝업 상태

    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [skip, setSkip] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    // ── 변경 감지 ──
    const hasChanges = useMemo(() => {
        if (!isDataLoaded) return false;
        if (deletedIds.length > 0) return true;
        if (variables.some(v => v.isNew)) return true;

        const originalMap = new Map(originalVariables.map(v => [v.id, v]));
        return variables.some(v => {
            const orig = originalMap.get(v.id);
            if (!orig) return true;
            return EDITABLE_FIELDS.some(f => v[f] !== orig[f]);
        });
    }, [variables, originalVariables, deletedIds, isDataLoaded]);

    // ── 데이터 조회 ──
    useEffect(() => {
        const fetchVariables = async () => {
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

                if (result?.variables) {
                    const transformedData = result.variables.map(item => {
                        const categoryStr = (item.labels || [])
                            .map(l => `${l.code}=${l.label}`)
                            .join(', ');

                        return {
                            id: item.id,
                            sysName: item.cQuestionVariable || '',
                            name: item.cQuestionVariable || '',
                            label: item.label || '',
                            type: item.type || 'Single',
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
                            labels: item.labels || []
                        };
                    });

                    const allZero = transformedData.every(v => v.startPos === 0);
                    const finalData = allZero ? recalcVariables(transformedData) : transformedData;

                    setVariables(finalData);
                    setOriginalVariables(JSON.parse(JSON.stringify(finalData)));
                } else if (result?.success === false || result?.status === 404 || result?.status === 400 || result?.status === 500) {
                    modal.showErrorAlert("에러", result?.message || "프로젝트 매핑 정보를 조회할 수 없습니다.");
                } else {
                    setVariables([]);
                    setOriginalVariables([]);
                }
            } catch (error) {
                console.error("맵 변수 조회 오류:", error);
                if (error.response?.status === 404) {
                    modal.showErrorAlert("알림", "프로젝트를 찾을 수 없습니다.");
                } else if (error.response?.status === 400) {
                    modal.showErrorAlert("알림", "잘못된 요청입니다.");
                } else {
                    modal.showErrorAlert("에러", "맵 목록 조회 중 오류가 발생했습니다.");
                }
            } finally {
                setIsDataLoaded(true);
                loadingSpinner.hide();
            }
        };

        fetchVariables();
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

    const handleLogicSave = (id, newLogicStr) => {
        setVariables(variables.map(v => v.id === id ? { ...v, logic: newLogicStr } : v));
        setEditingLogicPopupOpen(null);
    };

    const handleAddValueSave = (newLabels) => {
        if (!selectedVariableId) return;

        const newCategoryStr = newLabels.map(l => `{${l.code};${l.label}}`).join('');

        setVariables(variables.map(v =>
            v.id === selectedVariableId
                ? { ...v, labels: newLabels, category: newCategoryStr }
                : v
        ));

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

    const handleAddVariable = () => {
        setVariables(prev => {
            const newId = Date.now();
            let counter = 1;
            while (prev.some(v => v.sysName === `var_${counter}`)) counter++;
            const newName = `var_${counter}`;

            return [{
                id: newId,
                sysName: newName,
                name: newName,
                label: '',
                category: '',
                logic: '',
                count: '0 / 0',
                type: '범주형',
                isNew: true
            }, ...prev];
        });
    };

    const handleSave = () => {
        const executeSave = async () => {
            try {
                const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
                const userId = auth?.user?.userId || '';

                const originalMap = new Map(originalVariables.map(v => [v.id, v]));
                const updated = variables
                    .filter(v => {
                        if (v.isNew) return true;
                        const orig = originalMap.get(v.id);
                        if (!orig) return true;
                        return EDITABLE_FIELDS.some(f => v[f] !== orig[f]);
                    })
                    .map(v => ({
                        id: v.isNew ? 0 : v.id,
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
                        ranking: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        labels: v.labels || []
                    }));

                const result = await updateMapVariables.mutateAsync({
                    pn,
                    user: userId,
                    updated,
                    deleted: deletedIds,
                });

                if (result?.success === '777' || result?.success === true) {
                    modal.showAlert("알림", "저장되었습니다.", () => {
                        setDeletedIds([]);
                        setRefreshKey(prev => prev + 1);
                    });
                } else {
                    modal.showErrorAlert("에러", result?.message || "저장에 실패했습니다.");
                }
            } catch (e) {
                console.error('저장 오류:', e);
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
            }
        };

        modal.showConfirm("알림", "변경사항을 저장하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                { title: "확인", click: executeSave },
            ]
        });
    };

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
    }), [variables, editingRowId, isDetailed]);

    // ── 렌더 ──
    return (
        <MapManagementContext.Provider value={contextValue}>
            <div className="variable-page" data-theme="data-management">
                <DataHeader
                    title="맵 관리"
                    saveButtonLabel="변경사항 저장"
                    onSave={handleSave}
                    saveButtonDisabled={!hasChanges}
                />

                <div className="variable-page-content">
                    {/* 탭 버튼 */}
                    <div className="tab-container">
                        <button
                            className={`tab-btn ${activeTab === 'mapping' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mapping')}
                        >
                            MAP 구성
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
                            onClick={() => setActiveTab('category')}
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
                    <LogicEditPopup
                        variable={editingLogicPopupOpen}
                        variablesList={variables}
                        onClose={() => setEditingLogicPopupOpen(null)}
                        onSave={handleLogicSave}
                    />
                )}

                {/* 레이블 팝업 (textarea) */}
                <AddLabelPopup
                    isOpen={addValueModalOpen}
                    onClose={() => setAddValueModalOpen(false)}
                    onSave={handleAddValueSave}
                    initialLabels={selectedVariable?.labels}
                />
            </div>
        </MapManagementContext.Provider>
    );
};

export default MapManagementPage;

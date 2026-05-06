import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Trash2, Search, ChevronLeft, ChevronRight, Info, Wand2, Plus } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import CartesianGeneratorModal from "./CartesianGeneratorModal";
import { Button } from "@/components/ui/button";
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Input } from '@progress/kendo-react-inputs';

// ConditionHeaderCell is removed as it's not needed for base variables

const NumericEditCell = (props) => {
    const { dataItem, field, onChange } = props;
    const value = dataItem[field] || '';
    
    if (!dataItem.inEdit) {
        return (
            <td style={{ ...props.style, padding: '0 12px' }}>
                {value}
            </td>
        );
    }
    
    return (
        <td style={{ ...props.style, padding: 0 }} className="k-grid-edit-cell">
            <Input
                type="number"
                value={value}
                onChange={(e) => {
                    onChange({
                        dataItem: dataItem,
                        field: field,
                        syntheticEvent: e.syntheticEvent,
                        value: e.value
                    });
                }}
                className="no-spin"
                style={{ width: '100%', height: '100%' }}
            />
        </td>
    );
};

const AddQuestionPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getBaseVariableList, getNextBaseVariableId, saveBaseVariableMerge, deleteBaseVariable } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-banner');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSaveBanner();
        }
    }));

    const [isCartesianModalOpen, setIsCartesianModalOpen] = useState(false);
    const [banners, setBanners] = useState([]);
    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [bannerSearch, setBannerSearch] = useState('');
    const [currentLabel, setCurrentLabel] = useState('');
    const [currentId, setCurrentId] = useState('');
    const [currentXInfo, setCurrentXInfo] = useState('');


    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setBanners([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setBanners([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setBanners([...redoData]);
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
        if (banners.length > 0) {
            history.commit(banners);
        }
    }, [banners, history]);


    const handleDeleteBanner = (e, bannerId) => {
        e.stopPropagation();

        if (bannerId.startsWith('NEW_')) {
            const nextBanners = banners.filter(b => b.id !== bannerId);
            setBanners(nextBanners);

            if (selectedBanner === bannerId) {
                if (nextBanners.length > 0) {
                    setSelectedBanner(nextBanners[0].id);
                    setCurrentId(nextBanners[0].id);
                    setCurrentLabel(nextBanners[0].label);
                    setCurrentXInfo(nextBanners[0].type || '단일 응답형 (Single)');
                } else {
                    setSelectedBanner('');
                    setCurrentId('');
                    setCurrentLabel('');
                    setCurrentXInfo('');
                }
            }
            return;
        }

        // 2. 이미 서버에 존재하는 경우 (확인창 띄우고 API 호출)
        modal.showConfirm('알림', <span style={{ wordBreak: 'break-all' }}>문항({bannerId})을 삭제하시겠습니까?</span>, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        const pageId = sessionStorage.getItem('pageId');
                        const user = auth?.user?.userId;
                        if (!pageId || !auth?.user?.userId) return;
                        // const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
                        // const user = "sbbok";

                        try {
                            const result = await deleteBaseVariable.mutateAsync({
                                pageid: pageId,
                                user: user,
                                ids: [bannerId]
                            });

                            if (result?.success === '777') {
                                modal.showAlert('알림', '삭제되었습니다.');
                                // 현재 보고 있는 아이템이 삭제되었다면 'delete' 모드로 패치하여 첫번째 아이템 강제 선택
                                if (selectedBanner === bannerId) {
                                    await fetchVariablesData('delete');
                                } else {
                                    await fetchVariablesData('normal');
                                }
                            } else {
                                modal.showAlert('오류', result?.Message || '삭제 중 문제가 발생했습니다.');
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            modal.showAlert('오류', '삭제 요청에 실패했습니다.');
                        }
                    }
                }
            ]
        });
    };

    const handleAddNew = async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;
        
        try {
            loadingSpinner.show();
            const res = await getNextBaseVariableId.mutateAsync({ pageid: pageId, user: user });
            if (res?.success === '777' && res.resultjson?.next_id) {
                const tempId = res.resultjson.next_id;
                const newBanner = {
                    id: tempId,
                    label: '',
                    type: '',
                    info: [{ label2: '', label: '', inEdit: true }]
                };
                setBanners(prev => [newBanner, ...prev]);
                setSelectedBanner(tempId);
                setCurrentId(tempId);
                setCurrentLabel('');
                setCurrentXInfo('single');
            } else {
                modal.showAlert('오류', '신규 문항 ID를 받아오지 못했습니다.');
            }
        } catch(e) { 
            console.error(e);
            modal.showAlert('오류', '신규 문항 추가 요청에 실패했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    // --- 데이터 로직 ---
    const fetchVariablesData = async (mode = 'normal', targetIdToSelect = null) => {
        // mode: 'fresh'(방금 추가됨 -> 마지막 요소 선택), 'delete'(현재요소 삭제됨 -> 첫요소 선택), 'select'(특정 ID 지정), 'normal'(일반 갱신)
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || pageId === "null" || pageId === "undefined" || !user) return;
        // const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
        // const user = "sbbok";
        try {
            loadingSpinner.show();
            // 1. Base Variables List
            const baseRes = await getBaseVariableList.mutateAsync({ pageid: pageId, user: user });
            if (baseRes?.success === '777' && baseRes.resultjson) {
                const dataObj = baseRes.resultjson;
                const baseVars = Object.entries(dataObj)
                    .filter(([key]) => key !== 'count' && key !== 'first')
                    .map(([key, v]) => ({
                        id: v.id || key,
                        label: v.label || v.name || key,
                        type: v.type === 'single' ? 'single' :
                            (v.type === 'multi' || v.type === 'double') ? 'multi' :
                                v.type === 'scale' ? 'scale' :
                                    v.type === 'rank' ? 'rank' :
                                        v.type === 'numeric' ? 'open(숫자)' :
                                            (v.type === 'string' || v.type === 'open') ? 'open(문자)' : (v.type || 'single'),
                        subId: v.id || key,
                        info: Array.isArray(v.info) ? v.info.map(item => ({
                            ...item,
                            label2: item.value || item.label2 || '',
                            label: item.label || '',
                            inEdit: false
                        })) : []
                    }));
                
                // baseVars를 사이드바 목록으로 사용
                setBaseVariables(baseVars);
                setBanners(baseVars);
                history.reset(baseVars);

                if (baseVars.length > 0) {
                    const isFresh = mode === 'fresh';
                    const isDelete = mode === 'delete';
                    let target = isFresh ? baseVars[baseVars.length - 1] : baseVars[0];

                    if (targetIdToSelect) {
                        const foundTarget = baseVars.find(f => f.id === targetIdToSelect);
                        if (foundTarget) target = foundTarget;
                    }

                    if (isFresh || isDelete || targetIdToSelect || !selectedBanner) {
                        setSelectedBanner(target.id);
                        setCurrentLabel(target.label);
                        setCurrentId(target.id);
                        setCurrentXInfo(target.type || 'single');
                    }
                } else {
                    setSelectedBanner('');
                    setCurrentLabel('');
                    setCurrentId('');
                    setCurrentXInfo('');
                }
            } else {
                setBaseVariables([]);
                setBanners([]);
                history.reset([]);
                setSelectedBanner('');
                setCurrentLabel('');
                setCurrentId('');
                setCurrentXInfo('');
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const updateBannerInfo = useCallback((newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo, isDirty: true } : b));
        if (onUnsavedChange) onUnsavedChange(true);
    }, [selectedBanner, onUnsavedChange]);

    const handleRowClick = useCallback((e) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: b.info.map(it => ({ ...it, inEdit: it === e.dataItem })) } : b));
    }, [selectedBanner]);

    // 문항 목록 필터링
    const filteredBanners = useMemo(() => {
        const search = bannerSearch.toLowerCase();
        return banners.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [banners, bannerSearch]);

    useEffect(() => { 
        fetchVariablesData(); 
        
        const handlePageUpdate = () => fetchVariablesData('normal');
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [auth?.user?.userId]);

    const handleSaveBanner = async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;
        // const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
        // const user = "sbbok";

        const currentBannerData = banners.find(b => b.id === selectedBanner);
        if (!currentBannerData) return;

        if (!currentId.trim()) return modal.showAlert('알림', '문항 ID를 입력해주세요.');
        if (!currentLabel.trim()) return modal.showAlert('알림', '문항 라벨을 입력해주세요.');
        if (!currentXInfo || !currentXInfo.trim()) return modal.showAlert('알림', '문항 유형을 선택해주세요.');

        // 유효한 규칙만 필터링 (비어있는 그리드 행 제거)
        const validRules = currentBannerData.info.filter(r =>
            String(r.label2 || '').trim() !== '' ||
            String(r.label || '').trim() !== ''
        );

        if (validRules.length === 0) {
            return modal.showAlert('알림', '최소 1개의 조건문을 작성해야 합니다.');
        }

        // '할당될 값' 및 '보기 라벨' 필수 검사 기능 추가
        const hasEmptyLabel2 = validRules.some(r => String(r.label2 || '').trim() === '');
        if (hasEmptyLabel2) {
            return modal.showAlert('알림', '"할당될 값"은 필수입니다.');
        }

        const hasNonNumericLabel2 = validRules.some(r => {
            const val = String(r.label2 || '').trim();
            return val !== '' && isNaN(Number(val));
        });
        if (hasNonNumericLabel2) {
            return modal.showAlert('알림', '"할당될 값"은 숫자만 입력 가능합니다.');
        }

        const nextId = currentId.trim().toUpperCase();

        const typeMapReverse = {
            "single": "single",
            "scale": "scale",
            "multi": "multi",
            "rank": "rank",
            "open(문자)": "string",
            "open(숫자)": "numeric"
        };

        const mappedType = typeMapReverse[currentXInfo] || currentXInfo || 'single';

        const payloadVariables = {
            [nextId]: {
                id: nextId,
                label: currentLabel.trim(),
                type: mappedType,
                info: validRules.map((r) => {
                    const parsedVal = parseFloat(r.label2);
                    return {
                        value: isNaN(parsedVal) ? String(r.label2 || '') : parsedVal,
                        label: String(r.label || '')
                    };
                })
            }
        };

        try {
            loadingSpinner.show();
            // 기본 문항 저장 API 호출
            const result = await saveBaseVariableMerge.mutateAsync({
                pageid: pageId,
                user: user,
                variables: payloadVariables
            });

            if (result?.success === '777') {
                modal.showAlert('알림', '문항이 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false);
                await fetchVariablesData('select', nextId); // 방금 저장한 문항으로 포커싱 갱신
                return true;
            } else {
                modal.showAlert('오류', result?.Message || '저장 중 문제가 발생했습니다.');
            }
        } catch (error) {
            console.error('Save error:', error);
            modal.showAlert('오류', '저장 요청에 실패했습니다.');
        } finally {
            loadingSpinner.hide();
        }
        return false;
    };

    return (
        <>
            <style>
                {`
                .dp-add-question-dropdown .k-input-value-text {
                    font-weight: 400 !important;
                }
                .no-spin::-webkit-inner-spin-button,
                .no-spin::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .no-spin {
                    -moz-appearance: textfield;
                }
                `}
            </style>
            <DataHeader title="문항추가" onSave={handleSaveBanner}>
                <Button
                    onClick={() => setIsCartesianModalOpen(true)}
                    className="dp-btn"
                    style={{ color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff', height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                    <Wand2 size={14} style={{ marginRight: '6px' }} /> 변수 조합기 (자동생성)
                </Button>
            </DataHeader>
            <div className="dp-request-container" style={{ flex: 1, minHeight: 0, padding: '16px', gap: '12px' }} onClick={() => updateBannerInfo(banners.find(b => b.id === selectedBanner)?.info.map(it => ({ ...it, inEdit: false })) || [])}>


                {/* 2. 메인 레이아웃 */}
                <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                    <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        {!isBannerSidebarOpen && (
                            <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                                <div className="dp-collapsed-header">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        )}
                        <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                                <span>문항 목록 ({filteredBanners.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={handleAddNew}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                            height: '24px', padding: '0 8px', borderRadius: '4px',
                                            border: '1px solid #2563eb', color: '#2563eb', background: '#eff6ff',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={12} /> 추가
                                    </button>
                                    <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsBannerSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div className="dp-search-input-wrapper" style={{ flex: 1, width: '100%' }}>
                                    <Search size={14} className="dp-search-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="문항명 또는 ID 검색"
                                        value={bannerSearch}
                                        onChange={(e) => setBannerSearch(e.target.value)}
                                        className="dp-search-input"
                                    />
                                </div>
                            </div>
                            <div className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {filteredBanners.map(banner => (
                                    <div key={banner.id}
                                        className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedBanner(banner.id);
                                            setCurrentLabel(banner.label);
                                            setCurrentId(banner.id.startsWith('NEW_') ? '' : banner.id);
                                            setCurrentXInfo(banner.type || 'single');
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
                                                {banner.isDirty && (
                                                    <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '4px' }}>(수정됨)</span>
                                                )}
                                            </span>
                                        </div>
                                        <button className="dp-banner-delete"
                                            onClick={(e) => handleDeleteBanner(e, banner.id)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0 }}>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 ID</span>
                                    <input
                                        type="text"
                                        value={currentId}
                                        onChange={(e) => {
                                            setCurrentId(e.target.value);
                                            setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, isDirty: true } : b));
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        className="dp-input"
                                        style={{ flex: 1, minWidth: 0, height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 라벨</span>
                                    <input
                                        type="text"
                                        value={currentLabel}
                                        onChange={(e) => {
                                            setCurrentLabel(e.target.value);
                                            setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, isDirty: true } : b));
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        className="dp-input"
                                        style={{ flex: 1, minWidth: 0, height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 유형</span>
                                    <DropDownList
                                        data={["single", "scale", "multi", "rank", "open(문자)", "open(숫자)"]}
                                        value={currentXInfo || ''}
                                        className="dp-add-question-dropdown"
                                        onChange={(e) => {
                                            setCurrentXInfo(e.value);
                                            setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, isDirty: true } : b));
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        style={{ flex: 1, minWidth: 0, height: '32px', fontSize: '13px', fontWeight: 400, borderRadius: '6px' }}
                                    />
                                </div>
                            </div>
                            <div className="dp-content-actions" style={{ marginLeft: 'auto' }}>
                                {/* 저장 버튼이 상단 글로벌 헤더로 통합되어 이곳에서는 제거됨 */}
                            </div>
                        </div>
                        <div className="dp-table-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            <KendoGridV2
                                data={banners.find(b => b.id === selectedBanner)?.info || []}
                                reorderable addable showNo deletable editField="inEdit"
                                onDataChange={updateBannerInfo}
                                onRowClick={handleRowClick}
                                newRowTemplate={{ label2: '', label: '' }}
                            >
                                <Column field="label2" title="할당될 값" width="120px" cell={NumericEditCell} />
                                <Column field="label" title="보기 라벨" width="500px" />
                            </KendoGridV2>
                        </div>
                    </div>
                </div>
            </div>

            {/* 변수 조합기 모달 */}
            <CartesianGeneratorModal
                show={isCartesianModalOpen}
                onClose={() => setIsCartesianModalOpen(false)}
                variables={baseVariables}
                onApply={(rules) => {
                    const mappedRules = rules.map(rule => ({
                        label2: rule.label2,
                        label: rule.label,
                        inEdit: false // 삽입 시 일단 텍스트 모드(닫힌 상태)로 표출되게 함
                    }));

                    if (selectedBanner) {
                        setBanners(prev => prev.map(b => {
                            if (b.id === selectedBanner) {
                                // 기존 info 뒷부분에 규칙들을 추가하거나 덮어쓸 수 있는데,
                                // 이 부분에서는 기존 빈 규칙(length 1, empty properties)을 제거하고 추가
                                const currentInfo = b.info;
                                let newInfo = [...currentInfo];
                                if (newInfo.length === 1 && !newInfo[0].label2 && !newInfo[0].label) {
                                    newInfo = mappedRules;
                                } else {
                                    newInfo = [...newInfo, ...mappedRules];
                                }
                                return { ...b, info: newInfo };
                            }
                            return b;
                        }));
                    }
                }}
            />
        </>
    );
});

export default AddQuestionPage;

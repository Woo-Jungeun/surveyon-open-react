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

// --- 커스텀 헤더 셀 (조건 아이콘) ---
const ConditionHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="condition-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    width: 'max-content',
                    minWidth: '160px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left' // 헤더 중앙정렬 영향을 받지 않도록 분리
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 'bold'
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>조건</span>
                    </div>
                    <div style={{ fontSize: '13px', letterSpacing: '-0.3px', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><span style={{ fontWeight: 600 }}>• 동등 대조:</span> <span>GENDER == 1, REGION == 'A'</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 비교 대조:</span> <span>AGE &gt;= 20, AGE &lt; 30</span></div>
                        <div><span style={{ fontWeight: 600 }}>• IN 연산:</span> <span>AGE_GROUP in [2, 3, 4]</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 다중 조건:</span> <span>(SQ1 == 1 or SQ1 == 2) and SQ2 == 1</span></div>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

const AddQuestionPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getBaseVariableList, getComputedVariableList, saveComputedVariable, deleteBaseVariable } = DpRequestPageApi();
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
                        // const pageId = sessionStorage.getItem('pageId');
                        // const user = auth?.user?.userId;
                        // if (!pageId || !auth?.user?.userId) return;
                        const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
                        const user = "sbbok";

                        try {
                            const result = await deleteBaseVariable.mutateAsync({
                                pageid: pageId,
                                user: user,
                                variables: [bannerId]
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

    const handleAddNew = () => {
        const tempId = `NEW_${Date.now()}`;
        const newBanner = {
            id: tempId,
            label: '',
            type: '',
            info: [{ label3: '', label2: '', label: '', logic: '', inEdit: true }]
        };
        setBanners(prev => [newBanner, ...prev]);
        setSelectedBanner(tempId);
        setCurrentId('');
        setCurrentLabel('');
        setCurrentXInfo('');
    };

    // --- 데이터 로직 ---
    const fetchVariablesData = async (mode = 'normal', targetIdToSelect = null) => {
        // mode: 'fresh'(방금 추가됨 -> 마지막 요소 선택), 'delete'(현재요소 삭제됨 -> 첫요소 선택), 'select'(특정 ID 지정), 'normal'(일반 갱신)
        // const pageId = sessionStorage.getItem('pageId');
        // if (!pageId || !auth?.user?.userId) return;
        const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
        const testUser = "sbbok";
        try {
            loadingSpinner.show();
            // 1. Base Variables
            const baseRes = await getBaseVariableList.mutateAsync({ pageid: pageId, user: testUser });
            if (baseRes?.success === '777' && baseRes.resultjson) {
                const baseVars = Array.isArray(baseRes.resultjson) ? baseRes.resultjson : Object.values(baseRes.resultjson);
                setBaseVariables(baseVars);
            }

            // 2. Computed Variables
            const compRes = await getComputedVariableList.mutateAsync({ pageid: pageId, user: testUser });
            if (compRes?.success === '777' && compRes.resultjson) {
                const compVars = Array.isArray(compRes.resultjson) ? compRes.resultjson : Object.values(compRes.resultjson);
                const formatted = compVars.map((v, i) => ({
                    id: v.id || `var_${i}`,
                    label: v.name || v.label,
                    type: v.type === 'single' ? '단일 응답형 (Single)' :
                        v.type === 'double' ? '다중 응답형 (Double)' :
                            v.type === 'numeric' ? '숫자형 (Numeric / Scale)' : (v.type || '단일 응답형 (Single)'),
                    subId: v.id || `banner_0${i + 1}`,
                    info: Array.isArray(v.info) ? v.info.map(item => ({
                        ...item,
                        label3: item.label3 || '',
                        label2: item.value || item.label2 || '',
                        label: item.label || '',
                        logic: item.logic || '',
                        inEdit: false
                    })) : []
                }));
                setBanners(formatted);
                history.reset(formatted); // 초기 데이터를 히스토리에 설정

                if (formatted.length > 0) {
                    const isFresh = mode === 'fresh';
                    const isDelete = mode === 'delete';
                    let target = isFresh ? formatted[formatted.length - 1] : formatted[0];

                    if (targetIdToSelect) {
                        const foundTarget = formatted.find(f => f.id === targetIdToSelect);
                        if (foundTarget) target = foundTarget;
                    }

                    if (isFresh || isDelete || targetIdToSelect || !selectedBanner) {
                        setSelectedBanner(target.id);
                        setCurrentLabel(target.label);
                        setCurrentId(target.id);
                        setCurrentXInfo(target.type || '단일 응답형 (Single)');
                    }
                } else {
                    setSelectedBanner('');
                    setCurrentLabel('');
                    setCurrentId('');
                    setCurrentXInfo('');
                }
            } else {
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

    useEffect(() => { fetchVariablesData(); }, [auth?.user?.userId]);

    const handleSaveBanner = async () => {
        // const pageId = sessionStorage.getItem('pageId');
        // const user = auth?.user?.userId;
        // if (!pageId || !user) return;
        const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
        const testUser = "sbbok";

        const currentBannerData = banners.find(b => b.id === selectedBanner);
        if (!currentBannerData) return;

        if (!currentId.trim()) return modal.showAlert('알림', '문항 ID를 입력해주세요.');
        if (!currentLabel.trim()) return modal.showAlert('알림', '문항 라벨을 입력해주세요.');
        if (!currentXInfo || !currentXInfo.trim()) return modal.showAlert('알림', '문항 유형을 선택해주세요.');

        // 유효한 규칙만 필터링 (비어있는 그리드 행 제거)
        const validRules = currentBannerData.info.filter(r =>
            String(r.label2 || '').trim() !== '' ||
            String(r.label || '').trim() !== '' ||
            String(r.logic || '').trim() !== ''
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
            '단일 응답형 (Single)': 'single',
            '다중 응답형 (Double)': 'double',
            '숫자형 (Numeric / Scale)': 'numeric'
        };

        const mappedType = typeMapReverse[currentXInfo] || currentXInfo || 'single';

        const payloadVariables = {
            [nextId]: {
                id: nextId,
                label: currentLabel.trim(),
                type: mappedType,
                recoded_type: 'computed',
                info: validRules.map((r, idx) => {
                    const parsedVal = parseFloat(r.label2);
                    return {
                        index: idx + 1,
                        value: isNaN(parsedVal) ? String(r.label2 || '') : parsedVal,
                        label: String(r.label || ''),
                        logic: String(r.logic || '')
                    };
                })
            }
        };

        try {
            loadingSpinner.show();
            // 파생 문항 저장 API 호출 (임시: saveComputedVariable)
            const result = await saveComputedVariable.mutateAsync({
                pageid: pageId,
                user: testUser,
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
                                <span>추가된 문항 목록 ({filteredBanners.length})</span>
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
                                            setCurrentXInfo(banner.type || '단일 응답형 (Single)');
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
                                                {!banner.id.startsWith('NEW_') && banner.isDirty && (
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
                                        data={['단일 응답형 (Single)', '다중 응답형 (Double)', '숫자형 (Numeric / Scale)']}
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
                                newRowTemplate={{ label3: '', label2: '', label: '', logic: '' }}
                            >
                                <Column field="label2" title="할당될 값" width="200px" />
                                <Column field="label" title="보기 라벨" width="300px" />
                                <Column field="logic" title="조건" headerCell={ConditionHeaderCell} headerClassName="k-text-center" />
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
                        label3: '',
                        label2: rule.label2,
                        label: rule.label,
                        logic: rule.logic,
                        inEdit: true // 강제 편집 상태를 주어 저장 대상이 되게 함
                    }));

                    if (selectedBanner) {
                        setBanners(prev => prev.map(b => {
                            if (b.id === selectedBanner) {
                                // 기존 info 뒷부분에 규칙들을 추가하거나 덮어쓸 수 있는데,
                                // 이 부분에서는 기존 빈 규칙(length 1, empty properties)을 제거하고 추가
                                const currentInfo = b.info;
                                let newInfo = [...currentInfo];
                                if (newInfo.length === 1 && !newInfo[0].label2 && !newInfo[0].label && !newInfo[0].logic) {
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

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

        // 1. 저장하지 않은 임시 신규 문항일 경우 (확인창 없이 즉시 삭제)
        if (bannerId.startsWith('NEW_')) {
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            if (selectedBanner === bannerId) {
                setSelectedBanner('');
                setCurrentId('');
                setCurrentLabel('');
                setCurrentXInfo('');
            }
            return;
        }

        // 2. 이미 서버에 존재하는 경우 (확인창 띄우고 API 호출)
        modal.showConfirm('삭제 확인', `문항(${bannerId})을 삭제하시겠습니까?`, {
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
                                await fetchVariablesData(false); // 리스트 갱신
                                // 현재 보고 있는 아이템이 삭제되었다면 우측 에디터 비우기
                                if (selectedBanner === bannerId) {
                                    setSelectedBanner('');
                                    setCurrentId('');
                                    setCurrentLabel('');
                                    setCurrentXInfo('');
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
    const fetchVariablesData = async (isFresh = false) => {
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

                if (formatted.length > 0) {
                    const target = isFresh ? formatted[formatted.length - 1] : formatted[0];
                    if (isFresh || !selectedBanner) {
                        setSelectedBanner(target.id);
                        setCurrentLabel(target.label);
                        setCurrentId(target.id);
                        setCurrentXInfo(target.type || '단일 응답형 (Single)');
                    }
                }
            } else {
                setBanners([]);
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const updateBannerInfo = useCallback((newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo } : b));
    }, [selectedBanner]);

    // 배너 목록 필터링
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

        // 유효한 규칙만 필터링 (비어있는 그리드 행 제거)
        const validRules = currentBannerData.info.filter(r =>
            String(r.label2 || '').trim() !== '' ||
            String(r.label || '').trim() !== '' ||
            String(r.logic || '').trim() !== ''
        );

        if (validRules.length === 0) {
            return modal.showAlert('알림', '최소 1개의 조건문을 작성해야 합니다.');
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
                modal.showAlert('알림', '파생 문항이 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false);
                await fetchVariablesData(false); // 리스트 갱신
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
            <DataHeader title="문항추가" onSave={handleSaveBanner}>
                <Button
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
                                <span>생성된 배너 목록 ({filteredBanners.length})</span>
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
                                        placeholder="배너명 또는 ID 검색"
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
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ fontSize: '11px', opacity: 0.6 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
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
                                        onChange={(e) => {
                                            setCurrentXInfo(e.value);
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        style={{ flex: 1, minWidth: 0, height: '32px', fontSize: '13px', borderRadius: '6px' }}
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
                                onRowClick={(e) => updateBannerInfo(banners.find(b => b.id === selectedBanner).info.map(it => ({ ...it, inEdit: it === e.dataItem })))}
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
        </>
    );
});

export default AddQuestionPage;

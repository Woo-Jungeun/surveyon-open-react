import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Trash2, Search, ChevronLeft, ChevronRight, Wand2, Plus } from 'lucide-react';
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

// --- 숫자 전용 커스텀 셀 ---
const NumericEditCell = (props) => {
    const { dataItem, field, onChange } = props;
    const value = dataItem[field];

    if (!dataItem.inEdit) {
        return <td style={{ ...props.style, padding: '0 12px' }}>{value}</td>;
    }

    return (
        <td style={{ ...props.style, padding: 0 }} className="k-grid-edit-cell">
            <Input
                type="number"
                value={value}
                onChange={(e) => onChange({ dataItem, field, syntheticEvent: e.syntheticEvent, value: e.value })}
                className="no-spin"
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none' }}
            />
        </td>
    );
};

const AddQuestionPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getBaseVariableList, getNextBaseVariableId, saveBaseVariableMerge, recomputeComputedVariables, deleteBaseVariable } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const history = useUpdateHistory('dp-banner');
    const isHistoryAction = useRef(false);

    useImperativeHandle(ref, () => ({ save: async () => await handleSaveBanner() }));

    const [isCartesianModalOpen, setIsCartesianModalOpen] = useState(false);
    const [banners, setBanners] = useState([]);
    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [bannerSearch, setBannerSearch] = useState('');
    const [currentLabel, setCurrentLabel] = useState('');
    const [currentId, setCurrentId] = useState('');
    const [currentXInfo, setCurrentXInfo] = useState('');
    const listContainerRef = useRef(null);

    // ★ 핵심 최적화: 현재 선택된 문항의 info를 banners 배열에서 분리
    // → 셀 편집 시 banners 전체를 map()하지 않아도 됨 (성능 핵심)
    const [currentInfo, setCurrentInfo] = useState([]);
    const currentInfoRef = useRef([]);

    // 선택된 배너 ID ref (callback closure에서 최신값 참조 - 동기 업데이트로 race condition 방지)
    const selectedBannerRef = useRef('');

    // ★ 배너 전환 시 현재 info를 banners에 저장 후 새 배너 로드
    const selectBanner = useCallback((banner) => {
        const prevId = selectedBannerRef.current;
        if (prevId) {
            setBanners(prev => prev.map(b =>
                b.id === prevId ? { ...b, info: currentInfoRef.current } : b
            ));
        }
        // ref를 즉시 업데이트 (useEffect 비동기 대기 없이) → 빠른 연속 클릭 시 race condition 방지
        selectedBannerRef.current = banner.id;
        setSelectedBanner(banner.id);
        setCurrentId(banner.id.startsWith('NEW_') ? '' : banner.id);
        setCurrentLabel(banner.label);
        setCurrentXInfo(banner.type || 'single');
        setCurrentInfo(banner.info || []);
        currentInfoRef.current = banner.info || [];
    }, []);

    // Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            let data = null;
            if (e.key.toLowerCase() === 'z' && !e.shiftKey) data = history.undo();
            else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') data = history.redo();
            if (data) {
                isHistoryAction.current = true;
                setBanners([...data]);
                const targetId = selectedBannerRef.current;
                const target = data.find(b => b.id === targetId) || data[0];
                if (target) {
                    selectedBannerRef.current = target.id;
                    setSelectedBanner(target.id);
                    setCurrentId(target.tempId || target.id);
                    setCurrentLabel(target.label);
                    setCurrentXInfo(target.type || 'single');
                    setCurrentInfo(target.info || []);
                    currentInfoRef.current = target.info || [];
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    // 입력 상태를 banners에 자동 동기화 (Undo/Redo 트래킹 용도)
    useEffect(() => {
        if (!selectedBannerRef.current) return;
        const timer = setTimeout(() => {
            setBanners(prev => {
                const b = prev.find(x => x.id === selectedBannerRef.current);
                if (!b) return prev;
                const isSame = b.label === currentLabel &&
                    (b.type || 'single') === currentXInfo &&
                    b.info === currentInfoRef.current &&
                    (b.tempId || b.id) === currentId;
                if (isSame) return prev;

                return prev.map(x =>
                    x.id === selectedBannerRef.current
                        ? { ...x, label: currentLabel, type: currentXInfo, tempId: currentId, info: currentInfoRef.current, isDirty: true }
                        : x
                );
            });
            if (onUnsavedChange) onUnsavedChange(true);
        }, 500);
        return () => clearTimeout(timer);
    }, [currentId, currentLabel, currentXInfo, currentInfo, onUnsavedChange]);

    // 히스토리 커밋 (디바운스 500ms - 매 키입력마다 실행 방지)
    useEffect(() => {
        if (isHistoryAction.current) { isHistoryAction.current = false; return; }
        if (banners.length === 0) return;
        const timer = setTimeout(() => history.commit(banners), 500);
        return () => clearTimeout(timer);
    }, [banners, history]);

    const handleDeleteBanner = (e, bannerId) => {
        e.stopPropagation();
        if (bannerId.startsWith('NEW_')) {
            const nextBanners = banners.filter(b => b.id !== bannerId);
            setBanners(nextBanners);
            if (selectedBanner === bannerId) {
                if (nextBanners.length > 0) { selectBanner(nextBanners[0]); scrollToTop(); }
                else { setSelectedBanner(''); setCurrentId(''); setCurrentLabel(''); setCurrentXInfo(''); setCurrentInfo([]); currentInfoRef.current = []; }
            }
            return;
        }
        modal.showConfirm('알림', <span style={{ wordBreak: 'break-all' }}>문항({bannerId})을 삭제하시겠습니까?</span>, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        const pageId = sessionStorage.getItem('pageId');
                        const user = auth?.user?.userId;
                        if (!pageId || !user) return;
                        try {
                            const result = await deleteBaseVariable.mutateAsync({ pageid: pageId, user, variables: [bannerId] });
                            if (result?.success === '777') {
                                modal.showAlert('알림', '삭제되었습니다.');
                                await fetchVariablesData(selectedBanner === bannerId ? 'delete' : 'normal');
                            } else {
                                modal.showAlert('오류', result?.Message || '삭제 중 문제가 발생했습니다.');
                            }
                        } catch { modal.showAlert('오류', '삭제 요청에 실패했습니다.'); }
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
            const res = await getNextBaseVariableId.mutateAsync({ pageid: pageId, user });
            if (res?.success === '777' && res.resultjson?.next_id) {
                const tempId = res.resultjson.next_id;
                const newBanner = { id: tempId, label: '', type: 'single', info: [{ label2: '', label: '', inEdit: true }] };
                // 현재 info 저장 후 신규 추가
                const prevId = selectedBannerRef.current;
                setBanners(prev => {
                    const updated = prevId ? prev.map(b => b.id === prevId ? { ...b, info: currentInfoRef.current } : b) : prev;
                    return [...updated, newBanner];
                });
                setTimeout(scrollToBottom, 100);
                setSelectedBanner(tempId);
                selectedBannerRef.current = tempId;
                setCurrentId(tempId);
                setCurrentLabel('');
                setCurrentXInfo('single');
                setCurrentInfo([{ label2: '', label: '', inEdit: true }]);
                currentInfoRef.current = [{ label2: '', label: '', inEdit: true }];
            } else {
                modal.showAlert('오류', '신규 문항 ID를 받아오지 못했습니다.');
            }
        } catch (err) { console.error(err); }
        finally { loadingSpinner.hide(); }
    };

    const fetchVariablesData = async (mode = 'normal', targetIdToSelect = null) => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || pageId === "null" || pageId === "undefined" || !user) return;
        try {
            loadingSpinner.show();
            const baseRes = await getBaseVariableList.mutateAsync({ pageid: pageId, user });
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
                            label2: item.value ?? item.label2 ?? '',
                            label: item.label || '',
                            logic: item.logic || '',
                            inEdit: false
                        })) : []
                    }));

                setBaseVariables(baseVars);
                setBanners(baseVars);
                history.reset(baseVars);

                if (baseVars.length > 0) {
                    let target = mode === 'fresh' ? baseVars[baseVars.length - 1] : baseVars[0];
                    if (targetIdToSelect) {
                        const found = baseVars.find(f => f.id === targetIdToSelect);
                        if (found) target = found;
                    }
                    if (mode === 'fresh' || mode === 'delete' || targetIdToSelect || !selectedBannerRef.current) {
                        setSelectedBanner(target.id);
                        selectedBannerRef.current = target.id;
                        setCurrentLabel(target.label);
                        setCurrentId(target.id);
                        setCurrentXInfo(target.type || 'single');
                        setCurrentInfo(target.info || []);
                        currentInfoRef.current = target.info || [];
                    }
                    if (mode === 'delete') scrollToTop();
                } else {
                    setSelectedBanner(''); selectedBannerRef.current = '';
                    setCurrentLabel(''); setCurrentId(''); setCurrentXInfo('');
                    setCurrentInfo([]); currentInfoRef.current = [];
                }
            } else {
                setBanners([]); history.reset([]);
                setSelectedBanner(''); selectedBannerRef.current = '';
                setCurrentLabel(''); setCurrentId(''); setCurrentXInfo('');
                setCurrentInfo([]); currentInfoRef.current = [];
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    // ★ 핵심: banners를 건드리지 않고 currentInfo만 업데이트
    const updateBannerInfo = useCallback((newInfo) => {
        setCurrentInfo(newInfo);
        currentInfoRef.current = newInfo;
        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);

    // 목록 하단으로 스크롤 이동
    const scrollToBottom = useCallback(() => {
        if (listContainerRef.current) {
            listContainerRef.current.scrollTo({ top: listContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, []);

    // 목록 상단으로 스크롤 이동
    const scrollToTop = useCallback(() => {
        if (listContainerRef.current) {
            listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleRowClick = useCallback((e) => {
        setCurrentInfo(prev => prev.map(it => ({ ...it, inEdit: it === e.dataItem })));
        currentInfoRef.current = currentInfoRef.current.map(it => ({ ...it, inEdit: it === e.dataItem }));
    }, []);

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

        if (!currentId.trim()) return modal.showAlert('알림', '문항 ID를 입력해주세요.');
        if (!currentLabel.trim()) return modal.showAlert('알림', '문항 라벨을 입력해주세요.');
        if (!currentXInfo?.trim()) return modal.showAlert('알림', '문항 유형을 선택해주세요.');

        const validRules = currentInfoRef.current.filter(r =>
            String(r.label2 ?? '').trim() !== '' || String(r.label || '').trim() !== ''
        );
        if (validRules.length === 0) return modal.showAlert('알림', '최소 1개의 보기를 작성해야 합니다.');

        const hasEmptyLabel2 = validRules.some(r => String(r.label2 ?? '').trim() === '');
        if (hasEmptyLabel2) return modal.showAlert('알림', '"할당될 값"은 필수입니다.');

        const hasNonNumericLabel2 = validRules.some(r => {
            const val = String(r.label2 ?? '').trim();
            return val !== '' && isNaN(Number(val));
        });
        if (hasNonNumericLabel2) return modal.showAlert('알림', '"할당될 값"은 숫자만 입력 가능합니다.');

        const nextId = currentId.trim().toUpperCase();
        const typeMap = { single: 'single', scale: 'scale', multi: 'multi', rank: 'rank', 'open(문자)': 'string', 'open(숫자)': 'numeric' };
        const mappedType = typeMap[currentXInfo] || currentXInfo || 'single';

        const payloadVariables = {
            [nextId]: {
                id: nextId,
                label: currentLabel.trim(),
                type: mappedType,
                info: validRules.map((r, idx) => {
                    const parsedVal = parseFloat(r.label2);
                    const itemData = {
                        index: idx + 1,
                        value: isNaN(parsedVal) ? String(r.label2 ?? '') : parsedVal,
                        label: String(r.label || '')
                    };
                    if (r.logic) itemData.logic = String(r.logic);
                    return itemData;
                })
            }
        };

        try {
            loadingSpinner.show();
            const result = await saveBaseVariableMerge.mutateAsync({ pageid: pageId, user, variables: payloadVariables });
            if (result?.success === '777') {
                // 재계산 API 호출
                await recomputeComputedVariables.mutateAsync({ pageid: pageId, user });
                
                modal.showAlert('알림', '문항이 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false);
                await fetchVariablesData('select', nextId);
                setTimeout(scrollToBottom, 100);
                return true;
            } else {
                modal.showAlert('오류', result?.Message || '저장 중 문제가 발생했습니다.');
            }
        } catch { modal.showAlert('오류', '저장 요청에 실패했습니다.'); }
        finally { loadingSpinner.hide(); }
        return false;
    };

    const handleCloseEdit = useCallback(() => {
        setCurrentInfo(prev => prev.map(it => ({ ...it, inEdit: false })));
        currentInfoRef.current = currentInfoRef.current.map(it => ({ ...it, inEdit: false }));
    }, []);

    return (
        <>
            <style>{`.dp-add-question-dropdown .k-input-value-text { font-weight: 400 !important; }`}</style>
            <DataHeader title="문항추가" onSave={handleSaveBanner}>
                <Button
                    onClick={() => setIsCartesianModalOpen(true)}
                    className="dp-btn"
                    style={{ color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff', height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                    <Wand2 size={14} style={{ marginRight: '6px' }} /> 변수 조합기 (자동생성)
                </Button>
            </DataHeader>
            <div className="dp-request-container" style={{ flex: 1, minHeight: 0, padding: '16px', gap: '12px' }} onClick={handleCloseEdit}>
                <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                    {/* 사이드바 */}
                    <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        {!isBannerSidebarOpen && (
                            <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                                <div className="dp-collapsed-header"><ChevronRight size={16} /></div>
                            </div>
                        )}
                        <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                                <span>추가된 문항 목록 ({filteredBanners.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px', padding: '0 8px', borderRadius: '4px', border: '1px solid #2563eb', color: '#2563eb', background: '#eff6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
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
                                    <input type="text" placeholder="문항명 또는 ID 검색" value={bannerSearch} onChange={(e) => setBannerSearch(e.target.value)} className="dp-search-input" />
                                </div>
                            </div>
                            <div ref={listContainerRef} className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {filteredBanners.map(banner => (
                                    <div key={banner.id}
                                        className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                        onClick={() => selectBanner(banner)}
                                        style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
                                                {banner.isDirty && <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '4px' }}>(수정됨)</span>}
                                            </span>
                                        </div>
                                        <button className="dp-banner-delete" onClick={(e) => handleDeleteBanner(e, banner.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0 }}>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 ID</span>
                                    <input
                                        type="text"
                                        value={currentId}
                                        onChange={(e) => setCurrentId(e.target.value)}
                                        className="dp-input"
                                        style={{ flex: 1, minWidth: 0, height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 라벨</span>
                                    <input
                                        type="text"
                                        value={currentLabel}
                                        onChange={(e) => setCurrentLabel(e.target.value)}
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
                                        onChange={(e) => setCurrentXInfo(e.value)}
                                        style={{ flex: 1, minWidth: 0, height: '32px', fontSize: '13px', fontWeight: 400, borderRadius: '6px' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="dp-table-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            <KendoGridV2
                                data={currentInfo}
                                reorderable addable showNo deletable editField="inEdit"
                                onDataChange={updateBannerInfo}
                                onRowClick={handleRowClick}
                                newRowTemplate={{ label2: '', label: '', logic: '' }}
                            >
                                <Column field="label2" title="할당될 값" width="120px" cell={NumericEditCell} />
                                <Column field="label" title="보기 라벨" width="300px" />
                                <Column field="logic" title="조건" />
                            </KendoGridV2>
                        </div>
                    </div>
                </div>
            </div>

            <CartesianGeneratorModal
                show={isCartesianModalOpen}
                onClose={() => setIsCartesianModalOpen(false)}
                variables={baseVariables}
                onApply={(rules) => {
                    const mappedRules = rules.map(rule => ({ label2: rule.label2, label: rule.label, logic: rule.logic, inEdit: false }));
                    setCurrentInfo(prev => {
                        const newInfo = (prev.length === 1 && !prev[0].label2 && !prev[0].label && !prev[0].logic)
                            ? mappedRules : [...prev, ...mappedRules];
                        currentInfoRef.current = newInfo;
                        return newInfo;
                    });
                    if (onUnsavedChange) onUnsavedChange(true);
                }}
            />
        </>
    );
});

export default AddQuestionPage;

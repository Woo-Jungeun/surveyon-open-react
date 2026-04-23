import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Trash2, Search, ChevronLeft, ChevronRight, Info, Wand2, Plus, Copy, ChevronDown } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { DropDownList } from '@progress/kendo-react-dropdowns';

const MOCK_FILTERS = [
    { id: '1', label: '남성 * 20~29세', subLabel: '성별x연령' },
    { id: '2', label: '남성 * 30~39세', subLabel: '성별x연령' },
    { id: '3', label: '남성 * 40~49세', subLabel: '성별x연령' },
    { id: '4', label: '남성 * 50~59세', subLabel: '성별x연령' },
    { id: '5', label: '남성 * 60세 이상', subLabel: '성별x연령' },
    { id: '6', label: '보기1', subLabel: 'test_label2' },
    { id: '7', label: '보기2', subLabel: 'test_label2' },
    { id: '8', label: '여성 * 20~29세', subLabel: '성별x연령' },
    { id: '9', label: '여성 * 30~39세', subLabel: '성별x연령' },
    { id: '10', label: '여성 * 40~49세', subLabel: '성별x연령' },
    { id: '11', label: '여성 * 50~59세', subLabel: '성별x연령' },
    { id: '12', label: '여성 * 60세 이상', subLabel: '성별x연령' },
];

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

const CrossAnalysisPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getBaseVariableList, getComputedVariableList, saveComputedVariable, deleteBaseVariable } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-banner');
    const isHistoryAction = useRef(false);

    const [banners, setBanners] = useState([]);
    const [showN, setShowN] = useState(true);
    const [decimalN, setDecimalN] = useState(0);
    const [showPct, setShowPct] = useState(true);
    const [decimalPct, setDecimalPct] = useState(1);
    const [selectedXInfo, setSelectedXInfo] = useState('없음 (순수 빈도)');

    const [selectedFilters, setSelectedFilters] = useState(['5', '11']);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterAnchorRef = useRef(null);
    const filterPopupRef = useRef(null);
    const [filterPopupWidth, setFilterPopupWidth] = useState(180);

    useEffect(() => {
        if (isFilterOpen && filterAnchorRef.current) {
            setFilterPopupWidth(Math.max(filterAnchorRef.current.offsetWidth, 180));
        }

        const handleClickOutside = (event) => {
            if (isFilterOpen &&
                filterAnchorRef.current &&
                !filterAnchorRef.current.contains(event.target) &&
                filterPopupRef.current &&
                !filterPopupRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterOpen, selectedFilters]);

    const toggleFilter = (id) => {
        setSelectedFilters(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAllFilters = () => {
        if (selectedFilters.length === MOCK_FILTERS.length) {
            setSelectedFilters([]);
        } else {
            setSelectedFilters(MOCK_FILTERS.map(f => f.id));
        }
    };

    const getFilterButtonText = () => {
        if (selectedFilters.length === 0) return '전체'; // Or '선택 안됨' based on specific requirement
        if (selectedFilters.length === MOCK_FILTERS.length) return '전체';
        const first = MOCK_FILTERS.find(f => f.id === selectedFilters[0]);
        if (selectedFilters.length === 1) return first?.label || '선택됨';
        return `${first?.label} 외 ${selectedFilters.length - 1}건`;
    };

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

    return (
        <>
            <style>
                {`
                .dp-add-question-dropdown .k-input-value-text {
                    font-weight: 400 !important;
                }
                
                input[type="number"]::-webkit-inner-spin-button, 
                input[type="number"]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }

                .custom-xinfo-dropdown.k-dropdownlist,
                .custom-xinfo-dropdown.k-picker {
                    background-color: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                .custom-xinfo-dropdown.k-dropdownlist:hover,
                .custom-xinfo-dropdown.k-dropdownlist:focus,
                .custom-xinfo-dropdown.k-dropdownlist.k-focus,
                .custom-xinfo-dropdown.k-dropdownlist:focus-within {
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                    background-color: transparent !important;
                }
                .custom-xinfo-dropdown .k-input-inner {
                    padding: 0 10px;
                }
                .custom-xinfo-dropdown .k-input-button,
                .custom-xinfo-dropdown .k-button {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .custom-xinfo-dropdown .k-input-value-text {
                    font-size: 12px !important;
                }

                .custom-xinfo-popup .k-list-item-text {
                    font-size: 12px !important;
                }
                
                .filter-item-row:hover {
                    background-color: #f8fafc;
                }
                
                .filter-item-selected {
                    background-color: #e6effd !important;
                }

                .custom-filter-popup.k-popup {
                    background-color: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }
                `}
            </style>
            <DataHeader title="교차분석">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {/* 데이터 필터 Group */}
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: '100%' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>데이터 필터</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div ref={filterAnchorRef} style={{ padding: '0', display: 'flex', alignItems: 'center', background: '#ffffff', height: '100%' }}>
                            <div
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'transparent', color: '#1e293b',
                                    padding: '0 10px', height: '100%', cursor: 'pointer', fontSize: '12px', fontWeight: 400,
                                    userSelect: 'none', minWidth: '160px'
                                }}
                            >
                                <span style={{ fontSize: '12px' }}>{getFilterButtonText()}</span>
                                <ChevronDown size={14} color="#64748b" style={{ marginLeft: '12px' }} />
                            </div>
                        </div>
                    </div>

                    {/* X Info Dropdown Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', height: '32px', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: '100%', background: '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>X 정보 (기준변수)</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                            <DropDownList
                                data={['없음 (순수 빈도)', 'DQ3', '기본배너', 'SQ', 'SQ2 + SQ1 + SQ3', 'SQ1 * SQ3']}
                                value={selectedXInfo}
                                onChange={(e) => setSelectedXInfo(e.value)}
                                style={{ width: '160px', height: '100%', border: 'none', fontSize: '13px', color: '#1e293b' }}
                                className="custom-xinfo-dropdown"
                                popupSettings={{ className: "custom-xinfo-popup" }}
                            />
                            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    {/* N Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowN(!showN)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showN ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showN ? '#3b82f6' : '#3b82f6'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showN && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>N</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: '#ffffff' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: '#ffffff'
                            }}>
                                <input
                                    type="text"
                                    maxLength="1"
                                    value={decimalN}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-5]/g, '');
                                        setDecimalN(val !== '' ? parseInt(val) : 0);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#1e3a8a',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* % Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowPct(!showPct)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showPct ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showPct ? '#3b82f6' : '#3b82f6'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showPct && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>%</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: '#ffffff' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: '#ffffff'
                            }}>
                                <input
                                    type="text"
                                    maxLength="1"
                                    value={decimalPct}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-5]/g, '');
                                        setDecimalPct(val !== '' ? parseInt(val) : 0);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#1e3a8a',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        className="dp-btn"
                        onClick={() => {
                            // TODO: Add actual HTML copy logic
                            // modal.showAlert('알림', 'HTML이 클립보드에 복사되었습니다.');
                        }}
                        style={{
                            color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff',
                            height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px'
                        }}
                    >
                        <Copy size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> HTML 복사
                    </button>
                </div>
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
                                <span>테이블 목록 ({filteredBanners.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                        placeholder="변수명 또는 라벨 검색"
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
                                <Column field="label2" title="할당될 값" width="120px" />
                                <Column field="label" title="보기 라벨" width="500px" />
                                <Column field="logic" title="조건" headerCell={ConditionHeaderCell} headerClassName="k-text-center" />
                            </KendoGridV2>
                        </div>
                    </div>
                </div>
            </div>

            {/* 데이터 필터 모달 (Popup) */}
            <Popup
                anchor={filterAnchorRef.current}
                show={isFilterOpen}
                anchorAlign={{ horizontal: 'left', vertical: 'bottom' }}
                popupAlign={{ horizontal: 'left', vertical: 'top' }}
                popupClass="custom-filter-popup"
                style={{ width: `${filterPopupWidth}px`, marginTop: '4px', zIndex: 1000 }}
            >
                <div ref={filterPopupRef} style={{ background: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', display: 'flex', flexDirection: 'column', maxHeight: '420px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)' }}>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div
                            onClick={toggleAllFilters}
                            style={{ padding: '8px 14px', fontSize: '12px', color: '#1e293b', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', fontWeight: 400, display: 'flex', alignItems: 'center' }}
                            className={`filter-item-row ${selectedFilters.length === MOCK_FILTERS.length ? 'filter-item-selected' : ''}`}
                        >
                            <div style={{ width: '22px', display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    width: '13px', height: '13px', border: selectedFilters.length === MOCK_FILTERS.length ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                    borderRadius: '3px', background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {selectedFilters.length === MOCK_FILTERS.length && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                </div>
                            </div>
                            <span>전체</span>
                        </div>

                        <div style={{ padding: '2px 0' }}>
                            {MOCK_FILTERS.map(f => {
                                const isSelected = selectedFilters.includes(f.id);
                                return (
                                    <div
                                        key={f.id}
                                        onClick={() => toggleFilter(f.id)}
                                        className={`filter-item-row ${isSelected ? 'filter-item-selected' : ''}`}
                                        style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                                    >
                                        <div style={{ width: '22px', display: 'flex', justifyContent: 'flex-start', marginTop: '1px' }}>
                                            <div style={{
                                                width: '13px', height: '13px', border: isSelected ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                borderRadius: '3px', background: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 400, marginBottom: '2px' }}>{f.label}</div>
                                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{f.subLabel}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ padding: '8px 10px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                        <button
                            onClick={() => setIsFilterOpen(false)}
                            style={{ width: '100%', height: '30px', background: '#3b5bdb', color: '#fff', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseOver={(e) => e.target.style.background = '#364fc7'}
                            onMouseOut={(e) => e.target.style.background = '#3b5bdb'}
                        >
                            확인
                        </button>
                    </div>
                </div>
            </Popup>
        </>
    );
});

export default CrossAnalysisPage;

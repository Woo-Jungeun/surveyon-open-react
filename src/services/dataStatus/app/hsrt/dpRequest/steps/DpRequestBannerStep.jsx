import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Save, Trash2, ChevronDown, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X, ArrowUp, ArrowDown } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

const DpRequestBannerStep = () => {
    const auth = useSelector((store) => store.auth);
    const { getBannerDetail, getBaseVariableList } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const [banners, setBanners] = useState([]);
    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [colVars, setColVars] = useState([]);
    const [currentLabel, setCurrentLabel] = useState('');

    // Drag & Drop
    const handleDragStart = (e, payload) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);
            if (data.id) {
                if (index === 'new') {
                    setColVars(prev => [...prev, [data]]);
                } else {
                    setColVars(prev => {
                        const next = prev.map(g => [...g]);
                        if (next[index].length >= 3) {
                            alert('한 그룹당 최대 3개의 문항까지만 추가할 수 있습니다.');
                            return prev;
                        }
                        if (!next[index].find(v => v.id === data.id)) {
                            next[index].push(data);
                        }
                        return next;
                    });
                }
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const removeVar = (varId, groupIndex) => {
        setColVars(prev => {
            const next = prev.map(g => [...g]);
            next[groupIndex] = next[groupIndex].filter(v => v.id !== varId);
            if (next[groupIndex].length === 0) next.splice(groupIndex, 1);
            return next;
        });
    };

    // --- 상태 업데이트 관련 ---

    /**
     * 현재 선택된 배너의 상세 정보(Grid 데이터)를 업데이트합니다.
     */
    const updateBannerInfo = (newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo } : b));
    };

    /**
     * 그리드 상단 '행 추가' 버튼 클릭 시 실행됩니다.
     */
    const handleAddRow = () => {
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner) return;
        const newInfo = [...(currentBanner.info || [])];
        newInfo.push({ label3: '', label2: '', label: '', logic: '', inEdit: false });
        updateBannerInfo(newInfo);
    };

    /**
     * 그리드 행 클릭 시 편집 모드로 전환합니다.
     */
    const handleRowClick = (e) => {
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner) return;
        // 클릭한 행만 편집 가능하도록 상태 변경
        updateBannerInfo((currentBanner.info || []).map(item => ({ ...item, inEdit: item === e.dataItem })));
    };

    /**
     * 편집 모드를 해제합니다. (그리드 외부 클릭 시 호출)
     */
    const exitEditMode = () => {
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner) return;
        updateBannerInfo((currentBanner.info || []).map(item => ({ ...item, inEdit: false })));
    };

    // --- 데이터 통신 (API) 관련 ---

    /**
     * 배너 상세 정보를 서버로부터 가져옵니다.
     */
    useEffect(() => {
        const fetchBannerData = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId) return;
            try {
                loadingSpinner.show();
                const result = await getBannerDetail.mutateAsync({ pageid: pageId, user: auth?.user?.userId });
                if (result?.success === '777' && result.resultjson) {
                    if (result.resultjson.base_variables) {
                        const baseVars = result.resultjson.base_variables;
                        setBaseVariables(Array.isArray(baseVars) ? baseVars : Object.values(baseVars));
                    }
                    if (result.resultjson.recoded_variables) {
                        const raw = result.resultjson.recoded_variables;
                        const recodes = Array.isArray(raw) ? raw : Object.values(raw);
                        setBanners(recodes.map((v, i) => ({
                            id: v.id || `var_${i}`,
                            label: v.name || v.label,
                            subId: v.id || `banner_0${i + 1}`,
                            info: (v.info || v.categories || []).map(item => ({ ...item, inEdit: false }))
                        })));
                        if (recodes.length > 0 && !selectedBanner) {
                            const first = recodes[0];
                            setSelectedBanner(first.id || 'var_0');
                            setCurrentLabel(first.name || first.label || '');
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch banner details:', error);
            } finally {
                loadingSpinner.hide();
            }
        };
        if (auth?.user?.userId) fetchBannerData();
    }, [auth?.user?.userId]); // selectedBanner 의존성 제거

    useEffect(() => {
        const fetchBaseVariables = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId) return;
            try {
                const result = await getBaseVariableList.mutateAsync({ pageid: pageId, user: auth?.user?.userId });
                if (result?.success === '777' && result.resultjson) {
                    const vars = Object.values(result.resultjson);
                    setBaseVariables(vars);
                }
            } catch (error) {
                console.error('Failed to fetch base variables:', error);
            }
        };
        if (auth?.user?.userId) fetchBaseVariables();
    }, [auth?.user?.userId]);

    return (
        <div className="dp-request-container" onClick={exitEditMode}>
            {/* 자동 배너 구성 */}
            <div className="dp-wizard-accordion" onClick={(e) => e.stopPropagation()}>
                <div className="dp-accordion-header" onClick={() => setIsWizardOpen(prev => !prev)}>
                    <span>자동 배너 구성</span>
                    <div className="dp-accordion-icons">
                        <ChevronDown size={20} style={{ transform: isWizardOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                    </div>
                </div>

                {isWizardOpen && (
                    <div className="dp-wizard-body">
                        {/* 배너명 + 생성 버튼 */}
                        <div className="dp-wizard-toolbar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>배너 명</span>
                                <input
                                    type="text"
                                    placeholder="생성할 배너 이름을 입력하세요..."
                                    style={{ width: '300px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                                />
                            </div>
                            <button className="dp-primary-btn" style={{ padding: '6px 16px' }}>
                                배너 생성
                            </button>
                        </div>

                        {/* 변수 패널 + 드롭존 */}
                        <div className="dp-wizard-setup">
                            {/* 좌측 변수 패널 */}
                            <div className={`variable-panel ${!isVariablePanelOpen ? 'collapsed' : ''}`}>
                                <div className="variable-panel-header" style={{ justifyContent: isVariablePanelOpen ? 'space-between' : 'center', gap: '8px', padding: '12px 16px' }}>
                                    {isVariablePanelOpen && (
                                        <div className="search-input-wrapper" style={{ flex: 1 }}>
                                            <Search size={14} className="search-icon" />
                                            <input
                                                type="text"
                                                placeholder="문항을 검색하세요."
                                                value={wizardSearch}
                                                onChange={(e) => setWizardSearch(e.target.value)}
                                                className="search-input"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    )}
                                    <button
                                        className="toggle-button"
                                        onClick={() => setIsVariablePanelOpen(prev => !prev)}
                                        style={{ flexShrink: 0, padding: 0 }}
                                    >
                                        {isVariablePanelOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                    </button>
                                </div>

                                {isVariablePanelOpen && (
                                    <div className="variable-list">
                                        {(Array.isArray(baseVariables) ? baseVariables : [])
                                            .filter(v =>
                                                (v.label || '').toLowerCase().includes(wizardSearch.toLowerCase()) ||
                                                (v.id || '').toLowerCase().includes(wizardSearch.toLowerCase())
                                            )
                                            .map((v, idx) => (
                                                <div
                                                    key={`${v.id}-${idx}`}
                                                    className="variable-item"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, v)}
                                                >
                                                    <div className="variable-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                        <div className="variable-item__name">{v.id}</div>
                                                        {v.type && (
                                                            <span className={`question-type-badge ${String(v.type).toLowerCase()}`}>
                                                                {String(v.type).toLowerCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="variable-item__label">{v.label}</div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* 우측 드롭존 */}
                            <div className="drop-zones-container" style={{ borderLeft: '1px solid #e0e0e0', flex: 1, background: '#eff6ff', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span className="drop-zone-label" style={{ marginBottom: 0, fontSize: '13px', fontWeight: 600 }}>가로축 (열)</span>
                                        <button onClick={() => setColVars([])} className="axis-clear-btn" title="전체 삭제">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <div
                                        className="drop-zone-area"
                                        style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'stretch', padding: '12px', overflowX: 'auto', overflowY: 'hidden' }}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, 'new')}
                                    >
                                        {colVars.map((group, groupIndex) => (
                                            <div
                                                key={`group-${groupIndex}`}
                                                className="col-group"
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => { e.stopPropagation(); handleDrop(e, groupIndex); }}
                                            >
                                                <div className="group-drag-handle" title="그룹 이동">
                                                    <GripVertical size={16} />
                                                </div>
                                                <div className="col-group-items">
                                                    {group.map((v, itemIndex) => (
                                                        <div
                                                            key={`${v.id}-${itemIndex}`}
                                                            className="dropped-tag grouped"
                                                        >
                                                            <div className="item-drag-handle">
                                                                <GripVertical size={10} />
                                                            </div>
                                                            <span className="tag-text">{v.id}</span>
                                                            <X
                                                                size={13}
                                                                className="remove"
                                                                onClick={(e) => { e.stopPropagation(); removeVar(v.id, groupIndex); }}
                                                            />
                                                        </div>
                                                    ))}
                                                    {Array.from({ length: 3 - group.length }).map((_, i) => (
                                                        <div key={`empty-${i}`} className="empty-slot" />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {colVars.length === 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
                                                <Plus size={28} style={{ marginBottom: '8px', color: '#bfdbfe' }} />
                                                <div style={{ fontWeight: 600, fontSize: '14px', color: '#64748b' }}>새 그룹 (+)</div>
                                                <div style={{ fontSize: '12px' }}>문항을 끌어다 추가하세요</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 메인 레이아웃 */}
            <div className="dp-main-layout" onClick={(e) => e.stopPropagation()}>
                <div className="dp-sidebar">
                    <div className="dp-sidebar-title">생성된 배너 목록</div>
                    <div className="dp-banner-list">
                        {banners.map(banner => (
                            <div
                                key={banner.id}
                                className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                onClick={() => { setSelectedBanner(banner.id); setCurrentLabel(banner.label); }}
                            >
                                <div className="dp-banner-item-info">
                                    <span className="dp-banner-label">{banner.label}</span>
                                    <span className="dp-banner-sub">{banner.subId}</span>
                                </div>
                                <button className="dp-banner-delete"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dp-content">
                    <div className="dp-content-header">
                        <div className="dp-content-label-edit">
                            <span>배너 라벨</span>
                            <input
                                type="text"
                                value={currentLabel}
                                onChange={(e) => setCurrentLabel(e.target.value)}
                            />
                        </div>
                        <div className="dp-content-actions">
                            <button className="dp-primary-btn">
                                <Save size={16} />
                                <span>저장</span>
                            </button>
                        </div>
                    </div>

                    <div className="dp-table-container">
                        <KendoGridV2
                            data={banners.find(b => b.id === selectedBanner)?.info || []}
                            reorderable
                            addable
                            showNo
                            deletable
                            editField="inEdit"
                            onDataChange={updateBannerInfo}
                            onRowClick={handleRowClick}
                            newRowTemplate={{ label3: '', label2: '', label: '', logic: '' }}
                        >
                            <Column field="label3" title="라벨3" width="150px" />
                            <Column field="label2" title="라벨2" width="150px" />
                            <Column field="label" title="라벨" />
                            <Column field="logic" title="조건" width="180px" />
                        </KendoGridV2>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DpRequestBannerStep;

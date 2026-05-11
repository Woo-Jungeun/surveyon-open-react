import React, { useCallback, useState, useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { ColorPicker } from '@progress/kendo-react-inputs';
import { X, GripVertical, Plus, Trash2, Save, Copy, Check, Info } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import '@/components/common/popup/ConditionBuilderPopup.css';
import KendoGridV2 from '@/components/kendo/KendoGridV2';
import { GridColumn as Column } from '@progress/kendo-react-grid';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { DpRequestPageApi } from '../DpRequestPageApi';

let nextId = 0;
function getUniqueId() {
    return `combo-item-${nextId++}`;
}

const STUB_TYPE_OPTIONS = ["base", "scale", "option", "mean", "std", "median", "mode", "min", "max", "var", "sum", "variance", "rse", "rank"];

const LineStylePicker = ({ value, onChange, color }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popupWidth, setPopupWidth] = useState('80px');
    const anchorRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && anchorRef.current && !anchorRef.current.contains(e.target)) {
                if (!e.target.closest('.dp-line-picker-popup')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const options = ['solid', 'dashed', 'dotted', 'double', 'none'];
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                ref={anchorRef}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen && anchorRef.current) {
                        setPopupWidth(`${anchorRef.current.offsetWidth}px`);
                    }
                    setIsOpen(!isOpen);
                }}
                style={{ width: '100%', height: '28px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}
                title="선 종류"
            >
                {value === 'none' || !value ? (
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>없음</span>
                ) : (
                    <div style={{ width: '100%', borderTopStyle: value, borderTopWidth: value === 'double' ? '3px' : '2px', borderTopColor: color || '#475569' }} />
                )}
            </div>
            <Popup
                anchor={anchorRef.current}
                show={isOpen}
                animate={false}
                style={{ zIndex: 100000 }}
                popupClass="dp-line-picker-popup"
            >
                <div style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: popupWidth, padding: '4px 0', marginTop: '2px', boxSizing: 'border-box' }}>
                    {options.map(opt => (
                        <div
                            key={opt}
                            onClick={(e) => { e.stopPropagation(); onChange(opt); setIsOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: value === opt ? '#F1F5F9' : '#fff' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={(e) => e.currentTarget.style.background = value === opt ? '#F1F5F9' : '#fff'}
                        >
                            {opt === 'none' ? (
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>없음</span>
                            ) : (
                                <div style={{ width: '100%', borderTopStyle: opt, borderTopWidth: opt === 'double' ? '3px' : '2px', borderTopColor: color || '#475569' }} />
                            )}
                        </div>
                    ))}
                </div>
            </Popup>
        </div>
    );
};

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

// --- 로컬 상태 기반 텍스트 편집 셀 (성능 최적화용) ---
const TextEditCell = React.memo(({ dataItem, field, onUpdate, align = 'left', placeholder = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(String(dataItem[field] ?? ''));

    useEffect(() => {
        if (!isEditing) setLocalVal(String(dataItem[field] ?? ''));
    }, [dataItem.id, dataItem[field], isEditing]);

    const commit = () => {
        setIsEditing(false);
        if (localVal !== String(dataItem[field] ?? '')) onUpdate(dataItem, field, localVal);
    };

    if (isEditing) {
        return (
            <td style={{ padding: '1px 4px', verticalAlign: 'middle' }}>
                <input
                    autoFocus
                    placeholder={placeholder}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') { setLocalVal(String(dataItem[field] ?? '')); setIsEditing(false); }
                    }}
                    style={{ width: '100%', height: '22px', fontSize: '13px', border: '1px solid #3b82f6', outline: 'none', padding: '0 4px', borderRadius: '2px', textAlign: align }}
                />
            </td>
        );
    }

    return (
        <td
            onClick={() => setIsEditing(true)}
            style={{ padding: '1px 4px', verticalAlign: 'middle', cursor: 'text', textAlign: align }}
        >
            {localVal || (placeholder ? <span style={{ fontSize: '11px', opacity: 0.7 }}>{placeholder}</span> : '-')}
        </td>
    );
});

// --- 배경색 전용 셀 (Native Color Picker의 부드러운 드래그를 위해 컴포넌트 분리) ---
const ColorEditCell = React.memo(({ p, onUpdate }) => {
    const [localColor, setLocalColor] = useState(p.dataItem.color || '');

    // 외부에서 데이터 변경 시 로컬 상태 동기화
    useEffect(() => {
        setLocalColor(p.dataItem.color || '');
    }, [p.dataItem.color]);

    // 로컬 상태만 즉시 업데이트 (드래그 지연 방지)
    const handleChange = (e) => {
        setLocalColor(e.target.value.toUpperCase());
    };

    // 150ms 디바운스를 적용하여 그리드 전체 리렌더링 최소화
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localColor !== (p.dataItem.color || '')) {
                onUpdate(p.dataIndex, 'color', localColor);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [localColor, p.dataItem.color, p.dataIndex, onUpdate]);

    return (
        <td style={{ padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '2px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', position: 'relative', overflow: 'hidden' }} title="색상">
                    {!localColor && (
                        <div style={{ position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, background: 'linear-gradient(to top right, transparent calc(50% - 1px), #ef4444 calc(50%), transparent calc(50% + 1px))', pointerEvents: 'none', borderRadius: '2px' }} />
                    )}
                    <input
                        type="color"
                        value={(localColor || '#FFFFFF').slice(0, 7)}
                        onChange={handleChange}
                        style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer', opacity: localColor ? 1 : 0 }}
                    />
                </div>
                {localColor && (
                    <div
                        onClick={() => { setLocalColor(''); onUpdate(p.dataIndex, 'color', ''); }}
                        style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="색상 초기화"
                    >
                        <X size={14} color="#ef4444" />
                    </div>
                )}
            </div>
        </td>
    );
});

const DpRequestStubSettingModal = ({ show, onClose, variables = [], rowData, onApply }) => {
    const auth = useSelector(state => state.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { saveRecodedSet } = DpRequestPageApi();

    const [categories, setCategories] = useState([]);
    const [isDetailSetting, setIsDetailSetting] = useState(false);

    useEffect(() => {
        if (show) {
            setIsDetailSetting(false);
        }
        if (show && rowData) {
            if (rowData.info && rowData.info.length > 0) {
                const isFormatted = rowData.info.some(opt => opt.type !== undefined || opt.logic !== undefined || opt.condition !== undefined);

                if (isFormatted) {
                    const standardizedInfo = rowData.info.map(opt => ({
                        ...opt,
                        id: opt.id || getUniqueId(),
                        logic: opt.logic !== undefined ? opt.logic : opt.condition,
                        value: opt.value !== undefined ? opt.value : opt.val,
                        target_var: opt.target_var !== undefined ? opt.target_var : opt.targetVar,
                    }));
                    setCategories(standardizedInfo);
                } else {
                    const apiRows = rowData.info.map((opt, i) => {
                        const val = opt.val !== undefined ? opt.val : (opt.value !== undefined ? opt.value : (opt.row_id !== undefined ? opt.row_id : i + 1));
                        return {
                            ...opt,
                            id: getUniqueId(),
                            label: opt.label ? (String(opt.label).startsWith('_') ? opt.label : `_${opt.label}`) : `_${val}`,
                            type: 'single',
                            logic: `${rowData.recoded_var_id || rowData.source_var_id} in [${val}]`,
                            target_var: '',
                            value: val
                        };
                    });
                    setCategories(apiRows);
                }
            } else {
                setCategories([]);
            }
        }
    }, [show, rowData]);

    const handleCategoryCellUpdate = useCallback((dataIndex, field, value) => {
        setCategories(prev => {
            const next = [...prev];
            next[dataIndex] = { ...next[dataIndex], [field]: value };
            return next;
        });
    }, []);

    const renderColorCell = useCallback((p) => {
        return <ColorEditCell p={p} onUpdate={handleCategoryCellUpdate} />;
    }, [handleCategoryCellUpdate]);

    // 적용 이벤트
    const handleGenerate = () => {
        if (onApply) {
            onApply(categories);
        }
        onClose(); // 처리 후 모달 닫기
    };

    if (!show) return null;

    return (
        <div className="advanced-filter-overlay-cbp theme-blue">
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()} style={{ width: '1100px', height: '700px' }}>

                {/* 헤더 영역 */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0 }}>표 상세설정</h3>
                        {/* <p style={{ margin: 0, fontWeight: 'bold', color: '#1d4ed8', fontSize: '14px' }}>
                            [선택된 라벨] {rowData?.var_label || rowData?.recoded_var_id || '없음'}
                        </p> */}
                    </div>
                    <div className="header-actions-cbp">
                        <button onClick={onClose} className="close-btn-cbp"><X size={20} /></button>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="filter-popup-container-cbp" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', background: '#f0f7ff', boxSizing: 'border-box', overflowY: 'auto' }}>

                    {/* 상단 폼 영역 */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '60px' }}>변수</span>
                            <input type="text" value={rowData?.recoded_var_id || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px' }}>라벨</span>
                            <input type="text" value={rowData?.var_label || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>배너</span>
                            <input type="text" value={Array.isArray(rowData?.x_info) ? rowData.x_info.join(', ') : (rowData?.x_info || '')} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 하단 그리드 영역 */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* 그리드 옵션 헤더 */}
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsDetailSetting(!isDetailSetting)}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>상세 설정</span>
                                <div style={{ width: '32px', height: '18px', borderRadius: '10px', background: isDetailSetting ? '#3b82f6' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', display: 'flex', alignItems: 'center', padding: '2px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', left: isDetailSetting ? 'calc(100% - 16px)' : '2px', transition: 'left 0.2s' }} />
                                </div>
                            </div>
                        </div>

                        {/* 테이블 영역 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <KendoGridV2
                                data={categories}
                                onDataChange={setCategories}
                                onRowClick={(e) => {
                                    // Row 클릭 시 inEdit 처리 제거 (셀 단위 TextEditCell로 로컬 상태 편집)
                                }}
                                reorderable={true}
                                addable={true}
                                copyable={true}
                                deletable={true}
                                deletePos="start"
                                showNo
                                newRowTemplate={{ id: getUniqueId(), label: '', type: 'base', logic: '', target_var: '', value: '' }}
                                style={{ flex: 1, height: '100%', width: '100%' }}
                                scrollable="scrollable"
                            >
                                {isDetailSetting && <Column field="label2" title="대분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label2" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="label3" title="중분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label3" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                <Column field="label" title="소분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />
                                <Column
                                    field="type"
                                    title="형식"
                                    width="150px"
                                    cell={(p) => (
                                        <td style={{ padding: '4px' }}>
                                            <DropDownList
                                                className="k-dropdown-solid dp-mini-dropdown"
                                                popupSettings={{ className: "dp-mini-dropdown-popup" }}
                                                data={STUB_TYPE_OPTIONS}
                                                value={p.dataItem.type || 'base'}
                                                onChange={(e) => handleCategoryCellUpdate(p.dataIndex, 'type', e.value)}
                                                style={{ width: '100%', height: '28px', fontSize: '13px', background: '#fff' }}
                                            />
                                        </td>
                                    )}
                                />
                                <Column field="logic" title="조건" width="250px" headerCell={ConditionHeaderCell} headerClassName="k-text-center" cell={(p) => <TextEditCell dataItem={p.dataItem} field="logic" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />
                                <Column field="target_var" title="대상 변수" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="target_var" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />
                                <Column field="value" title="값" width="100px" headerClassName="k-text-center" className="k-text-center" cell={(p) => <TextEditCell dataItem={p.dataItem} field="value" align="center" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />

                                {isDetailSetting && <Column field="prefix" title="앞문자" width="120px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="prefix" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="postfix" title="뒷문자" width="120px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="postfix" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="round" title="소수점" width="100px" headerClassName="k-text-center" cell={(p) => <TextEditCell dataItem={p.dataItem} field="round" align="center" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="hide" title="숨기기" width="100px" headerClassName="k-text-center" cell={(p) => (
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px' }}>
                                        <div
                                            onClick={() => handleCategoryCellUpdate(p.dataIndex, 'hide', !p.dataItem.hide)}
                                            style={{
                                                width: '16px', height: '16px', border: '1px solid #94a3b8', borderRadius: '4px',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', background: p.dataItem.hide ? '#2563eb' : '#fff', margin: '0 auto'
                                            }}
                                        >
                                            {p.dataItem.hide && <Check size={12} color="#fff" strokeWidth={3} />}
                                        </div>
                                    </td>
                                )} />}
                                {isDetailSetting && <Column field="line" title="구분선" width="100px" cell={(p) => (
                                    <td style={{ padding: '4px', overflow: 'visible' }}>
                                        <LineStylePicker
                                            value={!p.dataItem.line ? "none" : p.dataItem.line}
                                            onChange={(val) => handleCategoryCellUpdate(p.dataIndex, 'line', val === "none" ? "" : val)}
                                        />
                                    </td>
                                )} />}
                                {isDetailSetting && <Column field="color" title="배경색" width="100px" cell={renderColorCell} />}
                            </KendoGridV2>
                        </div>
                    </div>
                </div>

                {/* 풋터 영역 */}
                <div className="filter-popup-footer-cbp">
                    <div className="footer-right-cbp">
                        <button className="btn-cancel-cbp" onClick={onClose}>취소</button>
                        <button className="btn-apply-cbp" onClick={handleGenerate} disabled={categories.length === 0} style={{ opacity: categories.length === 0 ? 0.5 : 1 }}>저장</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DpRequestStubSettingModal;

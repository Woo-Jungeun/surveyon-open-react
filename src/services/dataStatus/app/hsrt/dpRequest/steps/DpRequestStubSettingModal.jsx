import React, { useState } from 'react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { X, GripVertical, Plus, Trash2, Save, Copy } from 'lucide-react';
import '@/components/common/popup/ConditionBuilderPopup.css';
import KendoGridV2 from '@/components/kendo/KendoGridV2';
import { GridColumn as Column } from '@progress/kendo-react-grid';

let nextId = 0;
function getUniqueId() {
    return `combo-item-${nextId++}`;
}

const STUB_TYPE_OPTIONS = ["base", "base end(count)", "OPTION", "single", "double", "mean", "median", "mode", "min", "max", "std", "sum", "variance", "rse"];



const DpRequestStubSettingModal = ({ show, onClose, variables = [], rowData, onApply }) => {
    const [categories, setCategories] = useState([
        {
            id: getUniqueId(),
            label: 'Base',
            type: 'base',
            logic: rowData?.source_var_id ? `${rowData.source_var_id} is not null` : '',
            target_var: '',
            value: ''
        }
    ]);

    const handleCategoryCellUpdate = (dataIndex, field, value) => {
        setCategories(prev => {
            const next = [...prev];
            next[dataIndex] = { ...next[dataIndex], [field]: value };
            return next;
        });
    };

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
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '60px' }}>이름(ID)</span>
                            <input type="text" value={rowData?.source_var_id || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px' }}>라벨</span>
                            <input type="text" value={rowData?.var_label || ''} readOnly style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>배너</span>
                            <input type="text" value={rowData?.x_info?.join(', ') || ''} readOnly style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 하단 그리드 영역 */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* 테이블 영역 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <KendoGridV2
                                data={categories}
                                onDataChange={setCategories}
                                onRowClick={(e) => {
                                    setCategories(prev => prev.map(item => ({
                                        ...item,
                                        inEdit: item === e.dataItem
                                    })));
                                }}
                                reorderable={true}
                                addable={true}
                                copyable={true}
                                deletable={true}
                                showNo
                                newRowTemplate={{ id: getUniqueId(), label: '', type: 'base', logic: '', target_var: '', value: '' }}
                                style={{ flex: 1, height: '100%', width: '100%' }}
                            >
                                <Column field="label" title="라벨" width="150px" />
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
                                <Column field="logic" title="조건" width="250px" />
                                <Column field="target_var" title="저장될 변수" width="150px" />
                                <Column field="value" title="값" width="100px" headerClassName="k-text-center" className="k-text-center" />
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

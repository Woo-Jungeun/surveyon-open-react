import React, { useState, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { X, GripVertical, Plus, Trash2, Save, Copy, Check } from 'lucide-react';
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

const STUB_TYPE_OPTIONS = ["base", "base end(count)", "OPTION", "single", "double", "mean", "median", "mode", "min", "max", "std", "sum", "variance", "rse"];



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

    const handleCategoryCellUpdate = (dataIndex, field, value) => {
        setCategories(prev => {
            const next = [...prev];
            next[dataIndex] = { ...next[dataIndex], [field]: value };
            return next;
        });
    };

    // 적용 이벤트
    const handleGenerate = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;

        const stubId = rowData?.recoded_var_id || rowData?.source_var_id;

        const infoArray = categories.filter(opt => opt.type !== 'base').map((opt, i) => ({
            ...opt,
            index: i + 1,
            label: opt.label ? opt.label.replace(/^\s*/, '') : '',
            type: opt.type,
            logic: opt.logic || '',
            target_var: opt.target_var || null,
            value: opt.value || null
        }));

        const baseCategory = categories.find(opt => opt.type === 'base');

        const savePayload = {
            pageid: pageId,
            user: auth.user.userId,
            variables: {
                [stubId]: {
                    label: rowData?.var_label || '테스트 스터브',
                    filter_expression: baseCategory ? baseCategory.logic : '',
                    info: infoArray
                }
            },
            recoded_type: {
                [stubId]: 'recoded'
            }
        };

        try {
            loadingSpinner.show();
            const result = await saveRecodedSet.mutateAsync(savePayload);
            if (result?.success === "777") {
                modal.showAlert('알림', '상세설정이 저장되었습니다.');
                if (onApply) {
                    onApply(categories);
                }
                onClose(); // 처리 후 모달 닫기
            } else {
                modal.showAlert('오류', '상세설정 저장에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            modal.showAlert('오류', 'API 호출 중 에러가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
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
                                    setCategories(prev => prev.map(item => ({
                                        ...item,
                                        inEdit: item === e.dataItem
                                    })));
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
                                
                                {isDetailSetting && <Column field="label2" title="라벨2" width="150px" />}
                                {isDetailSetting && <Column field="label3" title="라벨3" width="150px" />}
                                {isDetailSetting && <Column field="prefix" title="앞문자" width="120px" />}
                                {isDetailSetting && <Column field="postfix" title="뒷문자" width="120px" />}
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
                                {isDetailSetting && <Column field="line" title="구분선" width="150px" cell={(p) => (
                                    <td style={{ padding: '4px' }}>
                                        <DropDownList
                                            className="k-dropdown-solid dp-mini-dropdown"
                                            popupSettings={{ className: "dp-mini-dropdown-popup" }}
                                            data={["선택 안함", "일반선", "굵은선", "이중선"]}
                                            value={p.dataItem.line === "" ? "선택 안함" : (p.dataItem.line || "선택 안함")}
                                            onChange={(e) => handleCategoryCellUpdate(p.dataIndex, 'line', e.value === "선택 안함" ? "" : e.value)}
                                            style={{ width: '100%', height: '28px', fontSize: '13px' }}
                                        />
                                    </td>
                                )} />}
                                {isDetailSetting && <Column field="color" title="배경색" width="150px" cell={(p) => (
                                    <td style={{ padding: '4px' }}>
                                        <DropDownList
                                            className="k-dropdown-solid dp-mini-dropdown"
                                            popupSettings={{ className: "dp-mini-dropdown-popup" }}
                                            data={["선택 안함", "gray", "blue", "red", "green", "yellow", "orange", "purple", "pink", "mint"]}
                                            value={p.dataItem.color === "" ? "선택 안함" : (p.dataItem.color || "선택 안함")}
                                            onChange={(e) => handleCategoryCellUpdate(p.dataIndex, 'color', e.value === "선택 안함" ? "" : e.value)}
                                            style={{ width: '100%', height: '28px', fontSize: '13px' }}
                                        />
                                    </td>
                                )} />}
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

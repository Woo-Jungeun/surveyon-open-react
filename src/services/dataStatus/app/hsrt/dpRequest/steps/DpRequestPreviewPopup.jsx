import React, { useEffect, useState, useContext } from 'react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { DpRequestPageApi } from "@/services/dataStatus/app/hsrt/dpRequest/DpRequestPageApi";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner";

const DpRequestPreviewPopup = () => {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [title, setTitle] = useState('미리보기 계산');
    const { evaluateVariable } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);

    useEffect(() => {
        const payloadStr = localStorage.getItem('dp_preview_payload');
        if (payloadStr) {
            try {
                const payload = JSON.parse(payloadStr);
                if (payload.table && payload.table.name) {
                    setTitle(`${payload.table.name} (미리보기)`);
                }

                const fetchData = async () => {
                    loadingSpinner.show();
                    try {

                        const res = await evaluateVariable.mutateAsync(payload);

                        if (res && res.success === '777' && res.resultjson) {
                            // API에서 내려주는 columns 배열 세팅 (예: [{ key: "total_auto", label: "?꿀겐", ... }])
                            const apiColumns = res.resultjson.columns || [];
                            setColumns(apiColumns);

                            const apiRows = res.resultjson.rows || [];
                            
                            // API가 base 행을 주지 않은 경우 수동으로 생성하여 최상단에 주입
                            const hasBaseRow = apiRows.some(r => r.row_role === 'base');
                            let finalRows = [...apiRows];

                            if (!hasBaseRow) {
                                const totalRow = {
                                    key: "__virtual_base_stub_preview_total",
                                    label: "전체",
                                    row_role: "base",
                                    stat_type: null,
                                    cells: {}
                                };

                                apiColumns.forEach(col => {
                                    totalRow.cells[col.key] = {
                                        count: col.total || 0,
                                        percent: 100,
                                        is_base: true,
                                        percent_base: col.total || 0,
                                        cell_type: "frequency"
                                    };
                                });
                                finalRows = [totalRow, ...finalRows];
                            }

                            setData(finalRows);
                        } else {
                            console.error("Failed to load preview data", res);
                        }
                    } catch (e) {
                        console.error("API Error", e);
                    } finally {
                        loadingSpinner.hide();
                    }
                };

                fetchData();
            } catch (e) {
                console.error("Failed to parse payload", e);
            }
        }
    }, []);

    // 동적 생성된 컬럼들의 셀 데이터를 렌더링 (N과 %를 위아래로 표시, stat_type인 경우 단일숫자 및 prefix/postfix 적용)
    const DataCellTemplate = (props) => {
        try {
            // 데이터가 cells 하위에 있거나 직접 필드명에 매핑되어 있을 수 있음
            const cellBox = props.dataItem.cells ? props.dataItem.cells[props.field] : props.dataItem[props.field];
            if (cellBox === undefined || cellBox === null) return <td style={{ textAlign: 'right', padding: '6px 16px', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0' }}>-</td>;

            const isSingleVal = typeof cellBox !== 'object';
            const singleVal = isSingleVal ? cellBox : null;
            const nValue = !isSingleVal ? (cellBox.count !== undefined ? cellBox.count : cellBox.n) : null;
            const pValue = !isSingleVal ? (cellBox.percent !== undefined ? cellBox.percent : cellBox.p) : null;
            const isBase = !isSingleVal && cellBox.is_base === true;

            return (
                <td style={{ textAlign: 'right', padding: '8px 16px', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                    {isSingleVal ? (
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                            {props.dataItem.prefix || ''}
                            {Number(singleVal).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            {props.dataItem.postfix || ''}
                        </div>
                    ) : (
                        <React.Fragment>
                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                                {nValue !== undefined && nValue !== null ? nValue.toLocaleString() : '-'}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                                {pValue !== undefined && pValue !== null ? `${Number(pValue).toFixed(1)}%` : '-'}
                            </div>
                        </React.Fragment>
                    )}
                </td>
            );
        } catch (e) {
            console.error("Cell render error:", e);
            return <td style={{ textAlign: 'right' }}>Error</td>;
        }
    };

    return (
        <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: '#f8fafc' }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '4px', height: '22px', background: '#3b82f6', borderRadius: '2px' }}></div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.5px' }}>{title}</h2>
            </div>
            <div style={{ flex: 1, minHeight: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <KendoGridV2 data={data} style={{ height: '100%' }}>
                    <Column
                        field="label"
                        title="구분"
                        headerClassName="k-text-center"
                        width="250px"
                        cell={(p) => (
                            <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: '600', fontSize: '13px' }}>
                                {p.dataItem.label}
                            </td>
                        )}
                    />
                    {columns.map(col => (
                        <Column
                            key={col.key}
                            field={col.key}
                            title={col.label}
                            headerClassName="k-text-center"
                            width="140px"
                            headerCell={(props) => (
                                <div 
                                    title={props.title} 
                                    style={{ 
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        fontSize: '12px',
                                        width: '100%'
                                    }}
                                >
                                    {props.title}
                                </div>
                            )}
                            cell={DataCellTemplate}
                        />
                    ))}
                </KendoGridV2>
            </div>
        </div>
    );
};

export default DpRequestPreviewPopup;

import React, { useState, useEffect, useMemo } from 'react';
import { Copy } from 'lucide-react';
import Toast from '../../../../components/common/Toast';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from '../../../../components/kendo/KendoGrid';
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import '../../../../assets/css/grid_vertical_borders.css';
import './DataViewerPage.css';
import { DataViewerPageApi } from './DataViewerPageApi';
import { useSelector } from 'react-redux';

// Performance Optimization: Define Cell outside component and use React.memo
const ReadOnlyCell = React.memo((props) => {
    const value = props.dataItem[props.field];
    const displayValue = (value !== null && value !== undefined) ? String(value) : '';

    return (
        <td style={{ ...props.style, borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }} className={props.className}>
            <div className="data-viewer-cell" title={displayValue}>
                {displayValue}
            </div>
        </td>
    );
});

const DataViewerPage = () => {
    const { getPageRows } = DataViewerPageApi();
    const auth = useSelector((store) => store.auth);
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    // Mock Data based on the user's image
    // const [data, setData] = useState([
    //     { id: 2, banner: 2, q1: 2, q2: 2, gender: 2, age: 21, region: 2, weight_demo: '1.00000000' },
    //     { id: 3, banner: 3, q1: 3, q2: 3, gender: 1, age: 24, region: 3, weight_demo: '1.20000000' },
    //     { id: 4, banner: 1, q1: 4, q2: 1, gender: 2, age: 27, region: 1, weight_demo: '1.40000000' },
    //     { id: 5, banner: 2, q1: 5, q2: 2, gender: 1, age: 30, region: 2, weight_demo: '1.60000000' },
    //     { id: 6, banner: 3, q1: 1, q2: 3, gender: 2, age: 33, region: 3, weight_demo: '0.80000000' },
    //     { id: 7, banner: 1, q1: 2, q2: 1, gender: 1, age: 36, region: 1, weight_demo: '1.00000000' },
    //     { id: 8, banner: 2, q1: 3, q2: 2, gender: 2, age: 39, region: 2, weight_demo: '1.20000000' },
    //     { id: 9, banner: 3, q1: 4, q2: 3, gender: 1, age: 42, region: 3, weight_demo: '1.40000000' },
    //     { id: 10, banner: 1, q1: 5, q2: 1, gender: 2, age: 45, region: 1, weight_demo: '1.60000000' },
    //     { id: 11, banner: 2, q1: 1, q2: 2, gender: 1, age: 50, region: 2, weight_demo: '0.80000000' },
    //     { id: 12, banner: 3, q1: 2, q2: 3, gender: 2, age: 55, region: 3, weight_demo: '1.00000000' },
    //     { id: 13, banner: 1, q1: 3, q2: 1, gender: 1, age: 18, region: 1, weight_demo: '1.20000000' },
    //     { id: 14, banner: 2, q1: 4, q2: 2, gender: 2, age: 21, region: 2, weight_demo: '1.40000000' },
    //     { id: 15, banner: 3, q1: 5, q2: 3, gender: 1, age: 24, region: 3, weight_demo: '1.60000000' },
    //     { id: 16, banner: 1, q1: 1, q2: 1, gender: 2, age: 27, region: 1, weight_demo: '0.80000000' },
    //     { id: 17, banner: 2, q1: 2, q2: 2, gender: 1, age: 30, region: 2, weight_demo: '1.00000000' },
    //     { id: 18, banner: 3, q1: 3, q2: 3, gender: 2, age: 33, region: 3, weight_demo: '1.20000000' },
    //     { id: 19, banner: 1, q1: 4, q2: 1, gender: 1, age: 36, region: 1, weight_demo: '1.40000000' },
    //     { id: 20, banner: 2, q1: 5, q2: 2, gender: 2, age: 39, region: 2, weight_demo: '1.60000000' },
    //     { id: 21, banner: 3, q1: 1, q2: 3, gender: 1, age: 42, region: 3, weight_demo: '0.80000000' },
    // ]);
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isLabelView, setIsLabelView] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";

                try {
                    const result = await getPageRows.mutateAsync({ user: userId, pageid: pageId, start: 0, limit: 2000 });
                    if (result.success === "777") {
                        const rows = result.resultjson?.rows || [];
                        setData(rows);

                        // Generate columns from the first row of data
                        if (rows.length > 0) {
                            const firstRow = rows[0];
                            const generatedColumns = Object.keys(firstRow).map(key => ({
                                field: key,
                                title: key,
                                show: true,
                                width: 100
                            }));
                            setColumns(generatedColumns);
                        }
                    } else {
                        console.error('API Error:', result?.message);
                        setToast({ show: true, message: result?.message || '데이터 조회 실패' });
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    setToast({ show: true, message: '데이터 조회 중 오류 발생' });
                }
            }
        };

        fetchData();
    }, [auth?.user?.userId]);

    const handleCopyToClipboard = async () => {
        try {
            // Header
            const headers = columns.filter(c => c.show).map(c => c.title).join('\t');
            // Rows
            const rows = data.map(item => {
                return columns.filter(c => c.show).map(c => item[c.field]).join('\t');
            }).join('\n');

            const text = `${headers}\n${rows}`;
            await navigator.clipboard.writeText(text);

            setToast({ show: true, message: '복사 완료 (Ctrl+V)' });
        } catch (err) {
            console.error('Failed to copy:', err);
            setToast({ show: true, message: '복사 실패' });
        }
    };

    const [pageState, setPageState] = useState({ skip: 0, take: 40 });

    const pageChange = (event) => {
        setPageState({
            skip: event.page.skip,
            take: event.page.take
        });
    };

    const columnMenu = (props) => (
        <ExcelColumnMenu
            {...props}
            columns={columns}
            onColumnsChange={setColumns}
            filter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
        />
    );

    const ReadOnlyCell = (props) => {
        return (
            <td style={props.style} className={props.className}>
                <div className="data-viewer-cell">
                    {props.dataItem[props.field]}
                </div>
            </td>
        );
    };

    return (
        <div className="data-viewer-page" data-theme="data-dashboard">
            <div className="data-viewer-header">
                <h2 className="data-viewer-title">
                    <span className="data-viewer-title-indicator"></span>
                    전체 데이터
                    <span className="data-viewer-count">
                        (총 {data.length}건)
                    </span>
                </h2>
                <div className="data-viewer-actions">

                    <button
                        onClick={() => setIsLabelView(!isLabelView)}
                        className="data-viewer-btn"
                    >
                        {isLabelView ? '값 보기' : '라벨 보기'}
                    </button>
                </div>

                <Toast
                    show={toast.show}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button
                    onClick={handleCopyToClipboard}
                    title="데이터 복사"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: 'none',
                        background: '#f3f4f6',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        color: '#4b5563',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                    <Copy size={14} />
                    복사
                </button>
            </div>
            <div className="cmn_grid singlehead data-viewer-grid-container">
                <KendoGrid
                    parentProps={{
                        data: data,
                        dataItemKey: "pid", // Use pid as unique key
                        sort,
                        filter,
                        sortChange: ({ sort }) => setSort(sort),
                        filterChange: ({ filter }) => setFilter(filter),
                        height: "100%",
                        columnVirtualization: false, // Temporarily disable due to rendering issues
                        scrollable: "virtual",
                        rowHeight: 40,
                        skip: pageState.skip,
                        pageSize: pageState.take,
                        total: data.length,
                        onPageChange: pageChange
                    }}
                >
                    {columns.filter(c => c.show).map((c) => (
                        <Column
                            key={c.field}
                            field={c.field}
                            title={c.title}
                            width={c.width}
                            minWidth={c.minWidth}
                            columnMenu={columnMenu}
                            cell={ReadOnlyCell}
                            headerClassName="k-header-center data-viewer-column-header"
                        />
                    ))}
                </KendoGrid>
            </div>
        </div>
    );
};

export default DataViewerPage;

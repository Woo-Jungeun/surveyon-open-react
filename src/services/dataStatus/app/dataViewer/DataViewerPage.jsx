import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Copy } from 'lucide-react';
import Toast from '../../../../components/common/Toast';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from '../../../../components/kendo/KendoGrid';
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import '../../../../assets/css/grid_vertical_borders.css';
import './DataViewerPage.css';
import { DataViewerPageApi } from './DataViewerPageApi';
import { useSelector } from 'react-redux';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

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
    const { getPageRows, getPageRows2 } = DataViewerPageApi();
    const auth = useSelector((store) => store.auth);
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isLabelView, setIsLabelView] = useState(false);

    // Hide loading spinner only after data is rendered
    useEffect(() => {
        if (isDataLoaded && data.length >= 0 && columns.length >= 0) {
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                loadingSpinner.hide();
            }, 100);
        }
    }, [isDataLoaded, data, columns]);

    useEffect(() => {
        const fetchData = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";

                try {
                    const apiCall = isLabelView ? getPageRows2 : getPageRows;
                    const result = await apiCall.mutateAsync({ user: userId, pageid: pageId, start: 0, limit: 2000 });
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
                                width: isLabelView ? 90 : 70
                            }));
                            setColumns(generatedColumns);
                        }
                        setIsDataLoaded(true);
                    } else {
                        console.error('API Error:', result?.message);
                        modal.showErrorAlert("오류", result?.message || '데이터 조회 실패');
                        loadingSpinner.hide();
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    modal.showErrorAlert("오류", '데이터 조회 중 오류가 발생했습니다.');
                    loadingSpinner.hide();
                }
            }
        };

        fetchData();
    }, [auth?.user?.userId, isLabelView]);

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
        <div className={`data-viewer-page ${isLabelView ? 'label-mode' : 'value-mode'}`} data-theme="data-dashboard">
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
                            transition: 'all 0.2s',
                            marginRight: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    >
                        <Copy size={14} />
                        복사
                    </button>

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
                        scrollable: "scrollable",
                        skip: pageState.skip,
                        pageSize: pageState.take,
                        total: data.length,
                        onPageChange: pageChange,
                        resizable: true
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

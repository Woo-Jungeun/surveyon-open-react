import React, { useState } from 'react';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from '../../../../components/kendo/KendoGrid';
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import '../../../../assets/css/grid_vertical_borders.css';

const DataViewerPage = () => {
    // Mock Data based on the user's image
    const [data, setData] = useState([
        { id: 2, banner: 2, q1: 2, q2: 2, gender: 2, age: 21, region: 2, weight_demo: '1.00000000' },
        { id: 3, banner: 3, q1: 3, q2: 3, gender: 1, age: 24, region: 3, weight_demo: '1.20000000' },
        { id: 4, banner: 1, q1: 4, q2: 1, gender: 2, age: 27, region: 1, weight_demo: '1.40000000' },
        { id: 5, banner: 2, q1: 5, q2: 2, gender: 1, age: 30, region: 2, weight_demo: '1.60000000' },
        { id: 6, banner: 3, q1: 1, q2: 3, gender: 2, age: 33, region: 3, weight_demo: '0.80000000' },
        { id: 7, banner: 1, q1: 2, q2: 1, gender: 1, age: 36, region: 1, weight_demo: '1.00000000' },
        { id: 8, banner: 2, q1: 3, q2: 2, gender: 2, age: 39, region: 2, weight_demo: '1.20000000' },
        { id: 9, banner: 3, q1: 4, q2: 3, gender: 1, age: 42, region: 3, weight_demo: '1.40000000' },
        { id: 10, banner: 1, q1: 5, q2: 1, gender: 2, age: 45, region: 1, weight_demo: '1.60000000' },
        { id: 11, banner: 2, q1: 1, q2: 2, gender: 1, age: 50, region: 2, weight_demo: '0.80000000' },
        { id: 12, banner: 3, q1: 2, q2: 3, gender: 2, age: 55, region: 3, weight_demo: '1.00000000' },
        { id: 13, banner: 1, q1: 3, q2: 1, gender: 1, age: 18, region: 1, weight_demo: '1.20000000' },
        { id: 14, banner: 2, q1: 4, q2: 2, gender: 2, age: 21, region: 2, weight_demo: '1.40000000' },
        { id: 15, banner: 3, q1: 5, q2: 3, gender: 1, age: 24, region: 3, weight_demo: '1.60000000' },
        { id: 16, banner: 1, q1: 1, q2: 1, gender: 2, age: 27, region: 1, weight_demo: '0.80000000' },
        { id: 17, banner: 2, q1: 2, q2: 2, gender: 1, age: 30, region: 2, weight_demo: '1.00000000' },
        { id: 18, banner: 3, q1: 3, q2: 3, gender: 2, age: 33, region: 3, weight_demo: '1.20000000' },
        { id: 19, banner: 1, q1: 4, q2: 1, gender: 1, age: 36, region: 1, weight_demo: '1.40000000' },
        { id: 20, banner: 2, q1: 5, q2: 2, gender: 2, age: 39, region: 2, weight_demo: '1.60000000' },
        { id: 21, banner: 3, q1: 1, q2: 3, gender: 1, age: 42, region: 3, weight_demo: '0.80000000' },
    ]);

    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    const [columns, setColumns] = useState([
        { field: 'id', title: 'id', show: true, width: '80px' },
        { field: 'banner', title: 'banner', show: true, minWidth: 100 },
        { field: 'q1', title: 'q1', show: true, minWidth: 100 },
        { field: 'q2', title: 'q2', show: true, minWidth: 100 },
        { field: 'gender', title: 'gender', show: true, minWidth: 100 },
        { field: 'age', title: 'age', show: true, minWidth: 100 },
        { field: 'region', title: 'region', show: true, minWidth: 100 },
        { field: 'weight_demo', title: 'weight_demo', show: true, minWidth: 150 },
    ]);

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
                <div style={{ padding: '8px', fontSize: '13px', color: '#333' }}>
                    {props.dataItem[props.field]}
                </div>
            </td>
        );
    };

    const [isLabelView, setIsLabelView] = useState(false);

    return (
        <div style={{ padding: '24px', background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column' }} data-theme="data-dashboard">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #eee'
            }}>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#111',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ width: '4px', height: '20px', background: 'var(--primary-color)', borderRadius: '2px', display: 'block' }}></span>
                    전체 데이터
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#888', marginLeft: '4px' }}>
                        (총 {data.length}건)
                    </span>
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsLabelView(!isLabelView)}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            background: 'var(--primary-color)',
                            color: '#fff',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--primary-color)';
                        }}
                    >
                        {isLabelView ? '값 보기' : '라벨 보기'}
                    </button>
                </div>
            </div>
            <div className="cmn_grid singlehead" style={{ flex: 1 }}>
                <KendoGrid
                    parentProps={{
                        data: data,
                        sort,
                        filter,
                        sortChange: ({ sort }) => setSort(sort),
                        filterChange: ({ filter }) => setFilter(filter),
                        height: "100%"
                    }}
                >
                    {columns.filter(c => c.show).map((c) => (
                        <Column
                            key={c.field}
                            field={c.field}
                            title={c.title}
                            width={c.width}
                            columnMenu={columnMenu}
                            cell={ReadOnlyCell}
                            headerClassName="k-header-center"
                            headerStyle={{
                                textAlign: 'center',
                                color: '#666',
                                fontWeight: '600'
                            }}
                        />
                    ))}
                </KendoGrid>
            </div>
        </div>
    );
};

export default DataViewerPage;

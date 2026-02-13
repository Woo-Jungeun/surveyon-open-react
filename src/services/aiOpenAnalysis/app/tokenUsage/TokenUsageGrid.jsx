import React, { useState, useMemo, Fragment } from "react";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { process } from "@progress/kendo-data-query";
import GridDataCount from "@/components/common/grid/GridDataCount";

/**
 * 토큰 사용 내역 > 그리드
 *
 * @author antigravity
 * @since 2026-02-06
 */
const TokenUsageGrid = ({ data }) => {
    const DATA_ITEM_KEY = "no";

    // 정렬/필터 상태 관리
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    // 컬럼 정의
    // allowHide: false 와 width 미지정 컬럼(프로젝트명)을 통해 가변 너비 확보 및 레이아웃 꽉 채움 유지
    const [columns, setColumns] = useState([
        { field: "no", title: "순번", show: true, width: "60px", allowHide: false, align: "center" },
        { field: "projectpof", title: "프로젝트POF", show: true, width: "150px", align: "center" },
        { field: "projectnum", title: "프로젝트번호", show: true, width: "150px", align: "center" },
        { field: "projectname", title: "프로젝트명", show: true, allowHide: false, align: "center" },
        { field: "register_userid", title: "등록자 ID", show: true, width: "115px", align: "center" },
        { field: "project_use_name", title: "사용자", show: true, width: "100px", align: "center" },
        { field: "usergroup", title: "사용자그룹", show: true, width: "160px", align: "center" },
        { field: "register_date", title: "등록일시", show: true, width: "165px", align: "center" },
        { field: "project_update_date", title: "최근업데이트", show: true, width: "165px", align: "center" },
        { field: "project_status", title: "진행상태", show: true, width: "110px", align: "center" },
        { field: "tokens_cost_sum", title: "토큰 비용($)", show: true, width: "135px", align: "center", filter: "numeric" }
    ]);

    // 데이터에 No 추가 및 비용 포맷팅
    const numberedData = useMemo(
        () => (Array.isArray(data) ? data : []).map((item, idx) => ({
            ...item,
            no: idx + 1,
            // 정렬을 위해 숫자형으로 변환 (표시는 cell renderer에서 처리)
            tokens_cost_sum: item.tokens_cost_sum ? Number(item.tokens_cost_sum) : 0
        })),
        [data]
    );

    // 필터/정렬 반영된 데이터
    const processedData = useMemo(
        () => process(numberedData, { sort, filter }),
        [numberedData, sort, filter]
    );

    // 공통 컬럼 메뉴
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns}
            onColumnsChange={(updated) => {
                const map = new Map(updated.map((c) => [c.field, c]));
                setColumns(columns.map((c) => map.get(c.field) || c));
            }}
            filter={filter}
            onFilterChange={(e) => setFilter(e ?? null)}
            onSortChange={(e) => setSort(e ?? [])}
        />
    );

    return (
        <Fragment>
            <GridDataCount total={processedData.total} />

            <div className="pro-list-card">
                <div className="cmn_gird_wrap">
                    <div id="grid_01" className="cmn_grid singlehead">
                        <KendoGrid
                            parentProps={{
                                height: "100%",
                                data: processedData.data,
                                total: processedData.total,
                                dataItemKey: DATA_ITEM_KEY,
                                sortable: { mode: "multiple", allowUnsort: true },
                                filterable: true,
                                sortChange: ({ sort }) => setSort(sort ?? []),
                                filterChange: ({ filter }) => setFilter(filter ?? undefined),
                                sort,
                                filter,
                            }}
                        >
                            {columns.filter((c) => c.show !== false).map((c) => (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    columnMenu={columnMenu}
                                    filter={c.filter}
                                    cell={(props) => {
                                        let value = props.dataItem[c.field];
                                        return (
                                            <td style={{ textAlign: (c.align || 'center') + ' !important' }}>
                                                {value}
                                            </td>
                                        );
                                    }}
                                />
                            ))}
                        </KendoGrid>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default TokenUsageGrid;

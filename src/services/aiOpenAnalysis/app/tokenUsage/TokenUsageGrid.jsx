import React, { Fragment, useState, useContext, useEffect, useMemo } from "react";
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
    const [columns, setColumns] = useState([
        { field: "no", title: "순번", show: true, width: "60px", allowHide: false },
        { field: "projectpof", title: "프로젝트POF", show: true, width: "150px" },
        { field: "projectnum", title: "프로젝트번호", show: true, width: "150px" },
        { field: "projectname", title: "프로젝트명", show: true }, // 가변 너비
        { field: "register_userid", title: "등록자 ID", show: true, width: "115px" },
        { field: "project_use_name", title: "사용자", show: true, width: "100px" },
        { field: "usergroup", title: "사용자그룹", show: true, width: "160px" },
        { field: "register_date", title: "등록일시", show: true, width: "165px" },
        { field: "project_update_date", title: "최근업데이트", show: true, width: "165px" },
        { field: "project_status", title: "진행상태", show: true, width: "110px" },
        { field: "tokens_cost_sum", title: "토큰 비용($)", show: true, width: "135px" }
    ]);

    // 데이터에 No 추가
    const numberedData = useMemo(
        () => (Array.isArray(data) ? data : []).map((item, idx) => ({
            ...item,
            no: idx + 1,
            tokens_cost_sum: item.tokens_cost_sum ? Number(item.tokens_cost_sum).toFixed(6) : "0.000000"
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
            <div className="cmn_gird_wrap">
                <GridDataCount total={processedData.total} />
                <div id="grid" className="cmn_grid singlehead">
                    <KendoGrid
                        parentProps={{
                            height: "600px",
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
                            />
                        ))}
                    </KendoGrid>
                </div>
            </div>
        </Fragment>
    );
};

export default TokenUsageGrid;

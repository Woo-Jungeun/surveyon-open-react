import {
    GridColumnMenuSort,
    GridColumnMenuFilter,
} from "@progress/kendo-react-grid";

const CustomColumnMenu = (props) => {
    const { onClose, columns = [], setColumns } = props;

    const onToggleColumn = (field) => {
        console.log("Toggle column:", field);

        const newColumns = columns.map((col) =>
            col.field === field ? { ...col, hidden: !col.hidden } : col
        );

        setColumns(newColumns);

        // 메뉴 닫기 (선택적으로 제거 가능)
        if (onClose) {
            onClose();
        }
    };

    return (
        <div style={{ padding: 10, width: 220 }}>
            {/* 정렬 */}
            <div>
                <strong>정렬</strong>
                <GridColumnMenuSort {...props} />
            </div>
            <hr />

            {/* 필터 */}
            <div>
                <strong>필터</strong>
                <GridColumnMenuFilter {...props} />
            </div>
            <hr />

            {/* 컬럼 표시/숨김 */}
            <div>
                <strong>컬럼 표시</strong>
                {columns?.map(col => {
                    const isChecked = !col.hidden;
                    return (
                        <div
                            key={col.field}
                            onClick={() => onToggleColumn(col.field)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                                gap: "6px",
                                padding: "2px 0"
                            }}
                        >
                            {/* 가짜 체크박스 */}
                            <div
                                style={{
                                    width: "14px",
                                    height: "14px",
                                    border: "1px solid #999",
                                    background: isChecked ? "#007bff" : "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontSize: "10px",
                                }}
                            >
                                {isChecked && "✔"}
                            </div>
                            <span>{col.title || col.field}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomColumnMenu;
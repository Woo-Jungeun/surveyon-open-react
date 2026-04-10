import { Grid, GridColumn as Column, GridNoRecords } from "@progress/kendo-react-grid";
import PropTypes from "prop-types";

/**
 * H-SRT 전용 Excel-Style Grid (Version 2)
 * 날카로운 직각 보더, 고밀도 패딩, 엑셀 헤더 감성을 기본 탑재한 독립형 그리드입니다.
 */
const KendoGridV2 = (props) => {
    const { 
        data = [], 
        children, 
        className = "", 
        height = "100%",
        ...rest 
    } = props;

    return (
        <Grid
            data={data}
            className={`dp-excel-grid-v2 ${className}`}
            style={{ height }}
            {...rest}
        >
            <GridNoRecords>
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "14px" }}>
                    조회된 데이터가 없습니다.
                </div>
            </GridNoRecords>
            {children}
        </Grid>
    );
};

KendoGridV2.propTypes = {
    data: PropTypes.array,
    children: PropTypes.node,
    className: PropTypes.string,
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default KendoGridV2;
export { Column as GridColumn };

import React, { Fragment, useState, useEffect, useRef, useMemo } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { ProEnterApi } from "@/components/app/proEnter/ProEnterApi";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSelector } from "react-redux";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";

/**
 * 프로젝트 등록 > 신규등록
 *
 * @author jewoo
 * @since 2025-09-24<br />
 */
const ProEnterTab3 = (props) => {
    const auth = useSelector((store) => store.auth);
    const MENU_TITLE = "rawdata";

    const { proEnterSaveData } = ProEnterApi();

    return (
        <>
            <div className="popCont">
                <div className="popTbl">
                    <div className="cmn_pop_ipt">
                        <span className="iptTit">등록자</span>
                        <Input
                            className="k-input k-input-solid"
                            value={auth?.user?.userNm || ""}
                            disabled={true}
                        />
                    </div>
                    <div className="cmn_pop_ipt">
                        <span className="iptTit">POF</span>
                        <Input
                            className="k-input k-input-solid"
                        // value={data?.keyword_string || ""}
                        // onChange={(e) => onChangeInputEvent(e, "keyword_string")}
                        />
                    </div>
                    <div className="cmn_pop_ipt">
                        <span className="iptTit">조사명</span>
                        <Input
                            className="k-input k-input-solid"
                        // value={data?.keyword_string || ""}
                        // onChange={(e) => onChangeInputEvent(e, "keyword_string")}
                        />
                    </div>
                </div>
            </div>

            <div className="popBtn">
                <div className="btnWrap">
                    <Button type={"submit"} className={"btnL"} themeColor={"primary"}>등록</Button>
                </div>
            </div>
        </>
    );
};

export default ProEnterTab3;

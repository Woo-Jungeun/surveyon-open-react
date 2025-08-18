import React, { Fragment, useState, useRef } from "react";
import { Button } from "@progress/kendo-react-buttons";
import GridTestTab1 from "@/components/app/grid/GridTestTab1"
import GridTestTab2 from "@/components/app/grid/GridTestTab2"
import GridTestTab3 from "@/components/app/grid/GridTestTab3"
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
/**
 * 그리드 > 테스트 그리드 body
 *
 * @author jewoo
 * @since 2024-08-11<br />
 */

const GridTestBody = () => {
    const TITLE_LIST = ["그리드", "테스트 그리드", ""];
    /* 선택된 탭 */
    const [tabDivision, setTabDivision] = useState("1");

    // 자식(Tab2) 메서드 호출용 ref
    const tab2Ref = useRef(null);
    
    // Tab2 저장버튼 클릭 시 이벤트 핸들러
    const onTab1SaveClick = () => {
        //   tab2Ref.current?.addButtonClick?.(); // 자식의 addButtonClick 실행 (행 추가)
    };
    // Tab2 추가버튼 클릭 시 이벤트 핸들러
    const onTab2AddClick = () => {
        tab2Ref.current?.addButtonClick?.(); // 자식의 addButtonClick 실행 (행 추가)
    };
    // Tab2 저장버튼 클릭 시 이벤트 핸들러
    const onTab2SaveClick = () => {
     //   tab2Ref.current?.addButtonClick?.(); // 자식의 addButtonClick 실행 (행 추가)
    };

    return (
        <Fragment>
            <article className="subTitWrap">
                <p className="subStep">
                    <span>{TITLE_LIST[0]}</span>
                    <span>{TITLE_LIST[1]}</span>
                    {TITLE_LIST[2] !== "" && <span>{TITLE_LIST[2]}</span>}
                </p>

                <div className="subTit">
                    <h2 className="titTxt">{TITLE_LIST[2] !== "" ? TITLE_LIST[2] : TITLE_LIST[1]}</h2>
                    {tabDivision === "1" && 
                        <div className="btnWrap">
                            <GridHeaderBtnPrimary  onClick={onTab1SaveClick}>등록</GridHeaderBtnPrimary>
                        </div>
                    }
                    {tabDivision === "2" && 
                        <div className="btnWrap">
                            <GridHeaderBtnPrimary  onClick={onTab2AddClick}>추가</GridHeaderBtnPrimary>
                            <GridHeaderBtnPrimary  onClick={onTab2SaveClick}>등록</GridHeaderBtnPrimary>
                        </div>
                    }
                </div>
            </article>

            <article className="subContWrap">
                <div className="subCont">
                    <div className="cmn_gird_wrap">
                        <div className="btnBox tabMenu">
                            <Button
                                className={tabDivision === "1" ? "btnTab on" : "btnTab"}
                                onClick={() => setTabDivision("1")}
                            >
                                응답 데이터
                            </Button>
                            <Button
                                className={tabDivision === "2" ? "btnTab on" : "btnTab"}
                                onClick={() => setTabDivision("2")}
                            >
                                보기 데이터
                            </Button>
                            <Button
                                className={tabDivision === "3" ? "btnTab on" : "btnTab"}
                                onClick={() => setTabDivision("3")}
                            >
                                rawdata
                            </Button>
                        </div>
                        {/* 탭 별 그리드 표출 */}
                        {tabDivision === "1"
                            ? <GridTestTab1 />
                            : tabDivision === "2"
                                ? <GridTestTab2  ref={tab2Ref}/>
                                : <GridTestTab3 />}
                    </div>
                </div>
            </article>
        </Fragment>
    );
};

export default GridTestBody;

import React, { Fragment, useState, useContext, useEffect } from "react";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { TokenUsageApi } from "@/services/aiOpenAnalysis/app/tokenUsage/TokenUsageApi";
import TokenUsageGrid from "@/services/aiOpenAnalysis/app/tokenUsage/TokenUsageGrid.jsx";

/**
 * 토큰 사용 내역
 *
 * @author antigravity
 * @since 2026-02-06
 */
const TokenUsage = () => {
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const [gridData, setGridData] = useState([]);
    const { tokenUsageListData } = TokenUsageApi();

    // 데이터 조회
    const fetchData = async () => {
        try {
            const payload = {
                params: {
                    user: auth?.user?.userId || "",
                }
            };
            const res = await tokenUsageListData.mutateAsync(payload);

            // 유저가 제공한 response structure: 
            // res.success === "777" 
            // res.resultjson.success === "777"
            // res.resultjson.resultjson -> 실제 리스트

            if (res?.success === "777") {
                const innerResult = res.resultjson;
                if (innerResult?.success === "777") {
                    setGridData(innerResult.resultjson || []);
                } else {
                    modal.showErrorAlert("에러", innerResult?.message || "토큰 사용 내역을 불러오지 못했습니다.");
                }
            } else {
                modal.showErrorAlert("에러", res?.message || "토큰 사용 내역을 불러오지 못했습니다.");
            }
        } catch (err) {
            console.error(err);
            modal.showErrorAlert("에러", "토큰 사용 내역 조회 중 오류가 발생했습니다.");
        }
    };

    /** 최초 진입 시 조회 */
    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Fragment>
            <article className="subTitWrap pro-list-header">
                <div className="subTit">
                    <h2 className="titTxt">
                        토큰 사용 내역
                        <span
                            className="info-icon"
                            data-tooltip={`토큰 사용 내역|이용 중인 전체 프로젝트의 토큰 사용 금액 내역입니다.`}
                        ></span>
                    </h2>
                </div>
            </article>

            <article className="subContWrap">
                <div className="subCont">
                    <TokenUsageGrid data={gridData} />
                </div>
            </article>
        </Fragment>
    );
};

export default TokenUsage;

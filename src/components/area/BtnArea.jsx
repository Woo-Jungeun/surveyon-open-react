import React from "react";

const BtnArea = ({ btns, title, ...options }) => {
    btns = btns || [];
    title = title || "타이틀";

    return (({ onClickCRUD }) => {
        return (
            <>
                <p className="subStep">
                    <span>홈</span>
                    <span>행정 업무</span>
                    <span>현금 수입금 관리</span>
                </p>

                <div className="subTit">
                    <h2 className="titTxt">{title}</h2>

                    {/* <div className="btnWrap">
						<button className="btnM">현금 수입금 등록</button>
						<button className="btnM btnTxt">선택 항목 삭제</button>
						<button className="btnM btnTxt">엑셀 업로드</button>
						<button className="btnM btnTxt">엑셀 출력</button>
					</div> */}
                    <div className="btnWrap">
                        {btns.map(({ text, id }, idx) => {
                            return (
                                <button
                                    key={idx}
                                    className={"btnM btnTxt"}
                                    onClick={() => {
                                        onClickCRUD.apply(null, [id]);
                                    }}
                                >
                                    {text}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </>
        );
    })(options);
};

export default BtnArea;

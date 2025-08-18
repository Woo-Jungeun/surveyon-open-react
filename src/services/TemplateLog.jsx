import GridArea from "@/components/area/GridArea";
import SearchArea from "@/components/area/SearchArea";
import { useState } from "react";
import BtnArea from "@/components/area/BtnArea";

const TemplateLog = ({ columns, title, api, addBtns, setMode, setSelectEvt, ...options }) => {
    // 반드시 null 체크 및 필요시 디폴트 셋팅 할것 ====================================================================
    title = title || "타이틀";
    addBtns = addBtns || [];
    // =============================================================================================================

    // 컨피그 컴포넌트에서 하는 역할.. state를 셋하기, 이벤트 effect하기
    // const Config = lazy(path);

    //렌더하는 state
    // columns를 빈배열로 선언하면 그리드 width가 0이 되는 현상발생
    const [i_columns, setColumns] = useState(columns);

    // 뷰에서 렌더할때 setBtns(btnConf) 필수!!! 같은 타입이 다른 버튼을 정의한다면 스테이트 공유로 버튼이 계속 추가되는 현상을 개선하기 위해 뷰에서 리셋해준다.
    const btnConf = [
        // { text: "추가", id: "I" },
        // { text: "삭제", id: "D" },
        { text: "엑셀", id: "EX" }
    ];
    const [btns, setBtns] = useState([...btnConf, ...addBtns]);

    //공통 이벤트 - 그리드 행 선택
    const handleSelect = (dataItem) => {
        // 어떠한 이벤트이던 인풋과 아웃풋만 잘 처리하면 된다.

        // 공통처리 로직.....

        //각 app에서 커스텀 가능한 이벤트 app에서 useEffect구현
        if(setSelectEvt) setSelectEvt({ ...dataItem });
    };

    //공통 이벤트 - 조회 입력시 변경 이벤트
    const handleChange = (field, value) => {
        // 어떠한 이벤트이던 인풋과 아웃풋만 잘 처리하면 된다.

        // 공통처리 로직.....
        let obj = columns.find((column) => column.field == field);
        if (obj) obj["value"] = value;
    };

    //공통 이벤트 - 조회
    const handleSearch = (e) => {
        setColumns([...columns]);
    };

    //공통 이벤트 버튼 클릭
    const handleClickCRUD = (mode) => {
        switch (mode) {
            case "EX":
                alert("다운로드");
                break;
        }

        //각 화면에서 이벤트 추가할때
        if (setMode) setMode({ value: mode });
    };

    return (
        <>
            <article className="subTitWrap">
                <BtnArea btns={btns} onClickCRUD={handleClickCRUD} title={title} />
            </article>
            <article className="subContWrap">
                <div className="subCont subContL">
                    <SearchArea columns={i_columns} onChange={handleChange} onSearch={handleSearch} />
                </div>
                <div className="subCont subContR">
                    <GridArea api={api} columns={i_columns} autoLoad={true} onSelect={handleSelect} />
                </div>
            </article>
        </>
    );
};

export default TemplateLog;

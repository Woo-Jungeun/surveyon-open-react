import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import ProEnterTab1 from "@/components/app/proEnter/ProEnterTab1";
import ProEnterTab2 from "@/components/app/proEnter/ProEnterTab2";
import ProEnterTab3 from "@/components/app/proEnter/ProEnterTab3";
import { modalContext } from "@/components/common/Modal.jsx";


/**
 * 프로젝트 등록 > Body
 *
 * @author jewoo
 * @since 2025-09-25<br />
 */
const ProEnterBody = () => {
  const modal = useContext(modalContext);
  const [tabDivision, setTabDivision] = useState("1");

  // 부모로 올리는 콜백을 “렌더 뒤”로 미루기 (defer)
  const useDeferred = () => {
    const defer = useCallback((fn) => (...args) => {
      setTimeout(() => fn?.(...args), 0);
    }, []);
    return defer;
  };
  const defer = useDeferred();

  // 정렬, 필터, 컬럼 숨기기 상태 유지
  const [gridPrefs, setGridPrefs] = useState({
    "1": { columns: null, sort: [], filter: null }, // 탭1
    "2": { columns: null, sort: [], filter: null }, // 탭2
    "3": { columns: null, sort: [], filter: null }, // 탭3
  });
  // 공통 업데이트 헬퍼
  const updateGridPrefs = useCallback((tab, patch) => {
    setGridPrefs(prev => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));
  }, []);


  return (
    <Fragment>
      <article className="subTitWrap">
        <div className="subTit">
          <h2 className="titTxt">프로젝트 등록</h2>
        </div>
      </article>

      <article className={`subContWrap`}>
        <div className="subCont">
          <div className="btnBox tabMenu  ">
            <Button className={tabDivision === "1" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("1")}>
              조사 (Qmaster)
            </Button>
            {/* todo 임시주석 */}
            {/* <Button className={tabDivision === "2" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("2")}>
              조사 (Perl)
            </Button> */}
            <Button className={tabDivision === "3" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("3")}>
              신규 등록
            </Button>
          </div>

          {tabDivision === "1" ? (
            <ProEnterTab1
              persistedPrefs={gridPrefs["1"]}
              onPrefsChange={defer((patch) => updateGridPrefs("1", patch))}
            />
          ) : tabDivision === "2" ? (
            <ProEnterTab2
              persistedPrefs={gridPrefs["2"]}
              onPrefsChange={defer((patch) => updateGridPrefs("2", patch))}
            />
          ) : <ProEnterTab3
            // persistedPrefs={gridPrefs["3"]}
            // onPrefsChange={defer((patch) => updateGridPrefs("3", patch))}
          />
          }
        </div>
      </article>
    </Fragment>
  );
};

export default ProEnterBody;
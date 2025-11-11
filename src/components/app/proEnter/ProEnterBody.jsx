import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import ProEnterTab1 from "@/components/app/proEnter/ProEnterTab1";
import ProEnterTab2 from "@/components/app/proEnter/ProEnterTab2";
import ProEnterTab3 from "@/components/app/proEnter/ProEnterTab3";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";

/**
 * 프로젝트 등록 > Body
 *
 * @author jewoo
 * @since 2025-09-25<br />
 */
const ProEnterBody = () => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const userGroup = auth?.user?.userGroup || "";
  // "솔루션" 또는 "조사지원팀"만 Qmaster 탭 허용
  const canViewQmaster = ["솔루션", "조시지원팀"].some(keyword =>
    userGroup.includes(keyword)
  );
  // 초기 탭: Qmaster 가능 → "1", 아니면 "3"
  const [tabDivision, setTabDivision] = useState(canViewQmaster ? "1" : "3");

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
          <div className="btnBox tabMenu">
            {canViewQmaster && (
              <Button
                className={tabDivision === "1" ? "btnTab on" : "btnTab"}
                onClick={() => setTabDivision("1")}
              >
                조사 (Qmaster)
                <span
                  className="info-icon"
                  data-tooltip={`조사(Qmaster)|조사에 연동된 프로젝트 등록\n(원하는 프로젝트가 없을 경우 웹제작담당자에게 문의)\n설문온 등록 여부에 따라 등록 가능 여부 확인`}
                ></span>
              </Button>
            )}
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
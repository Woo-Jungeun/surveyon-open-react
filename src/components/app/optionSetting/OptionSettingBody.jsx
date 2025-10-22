import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import OptionSettingInfo from "@/components/app/optionSetting/OptionSettingInfo";
import OptionSettingTab1 from "@/components/app/optionSetting/OptionSettingTab1";
import OptionSettingTab2 from "@/components/app/optionSetting/OptionSettingTab2";
import OptionSettingTab3 from "@/components/app/optionSetting/OptionSettingTab3";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { modalContext } from "@/components/common/Modal.jsx";
import OptionSettingLv3Panel from "@/components/app/optionSetting/OptionSettingLv3Panel.jsx";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";

/**
 * 분석 > Body
 *
 * @author jewoo
 * @since 2025-08-14<br />
 */

function openCenteredPopup(url, title = "viewer", w = 2000, h = 800) {
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop = window.screenTop ?? window.screenY ?? 0;
  const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;
  const systemZoom = width / (window.screen?.availWidth || width);
  const left = (width - w) / 2 / systemZoom + dualLeft;
  const top = (height - h) / 2 / systemZoom + dualTop;
  const features = `scrollbars=yes,resizable=yes,width=${w},height=${h},top=${top},left=${left}`;
  const win = window.open(url, title, features);
  try { win?.focus?.(); } catch { }
  return win;
}

const OptionSettingBody = () => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const { state } = useLocation();
  const projectnumFromState = state?.projectnum ?? sessionStorage.getItem("projectnum") ?? "";
  const qnum = state?.qnum;
  const projectnum = projectnumFromState;

  useEffect(() => {
    if (projectnumFromState) {
      sessionStorage.setItem("projectnum", projectnumFromState); //진입 시 projectnum을 세션에 보관
    }
  }, [projectnumFromState]);

  const TITLE_LIST = ["분석 대메뉴", "분석 메뉴", ""];
  const [tabDivision, setTabDivision] = useState("1");
  const [isLeftOpen, setIsLeftOpen] = useState(true);     // 상태를 부모가 보유
  const [analysisCount, setAnalysisCount] = useState(null); // 최초 분석값 저장
  const [canSave, setCanSave] = useState({ "1": false, "2": false }); // 히스토리 변화가 있을 때만 true
  const tab1Ref = useRef(null);
  const tab2Ref = useRef(null);
  const [responseCount, setResponseCount] = useState(0);  // 탭1 데이터 갯수

  // 오른쪽 패널 관련 state
  const [isLv3PanelOpen, setIsLv3PanelOpen] = useState(false);
  const [lv3Options, setLv3Options] = useState([]);  // 패널에 줄 옵션 데이터
  const [lv3Targets, setLv3Targets] = useState(new Set());

  // Tab1 → 패널 열기 요청
  const handleOpenLv3Panel = useCallback((targetRows, codeIds) => {
    setLv3Targets(new Set(targetRows.map(r => r.__rowKey)));  // 선택된 행들 key 저장
    setCurrentCodeIds(codeIds);                               // 패널 초기 선택용
    setIsLv3PanelOpen(true);
  }, []);

  /*버튼 이벤트 핸들러*/
  const onTab1SaveClick = () => tab1Ref.current?.saveChanges?.();
  const onTab2SaveClick = async () => {
    const ok = await tab2Ref.current?.saveChanges?.();
    if (ok) {
      // 저장 성공 → Lv3 코드 재조회
      await fetchLv3Options();
    }
  };

  const LVCODE_OPTION = [
    { text: "1단계", value: "1" },
    { text: "2단계", value: "2" },
    { text: "3단계", value: "3" }
  ];

  const [lvCodeCommitted, setLvCodeCommitted] = useState(LVCODE_OPTION[0]);
  const [lvCodeDraft, setLvCodeDraft] = useState(LVCODE_OPTION[0]);
  const stageHistRef = useRef({ back: [LVCODE_OPTION[0]], fwd: [] }); // 단계 드롭다운 undo/redo 스택
  const stageChanged = lvCodeDraft?.value !== lvCodeCommitted?.value; // 단계설정 수정했는지 확인

  // 부모로 올리는 콜백을 “렌더 뒤”로 미루기 (defer)
  const useDeferred = () => {
    const defer = useCallback((fn) => (...args) => {
      setTimeout(() => fn?.(...args), 0);
    }, []);
    return defer;
  };
  const defer = useDeferred();

  // Tab1에서 최초 조회한 lvcode를 받아 드롭다운 값 세팅
  const handleInitLvCode = useCallback((fetched) => {
    const v = String(fetched ?? "").trim();
    if (!["1", "2", "3"].includes(v)) return;
    const next = LVCODE_OPTION.find(o => o.value === v);
    if (!next) return;
    setLvCodeCommitted(prev => (prev?.value === v ? prev : next));
    setLvCodeDraft(prev => (prev?.value === v ? prev : next));
    // 단계 히스토리 초기화
    stageHistRef.current = { back: [next], fwd: [] };
  }, []);

  // 탭별 더티 상태 관리
  const [unsaved, setUnsaved] = useState({ "1": false, "2": false, "3": false });
  const markUnsaved = useCallback((tab, v) => {
    setUnsaved(prev => (prev[tab] === v ? prev : { ...prev, [tab]: v }));
  }, []);

  // 공용 모달로 확인창 (취소 | 이동 | 저장 후 이동)
  const confirmNavigate = useCallback((message, canSave = true) => {
    return new Promise((resolve) => {
      modal.showConfirm("알림", message, {
        btns: [
          { title: "취소", click: () => resolve("cancel") },
          { title: "이동", click: () => resolve("go") },
          // 저장 가능한 탭(1,2)에서만 노출
          ...(canSave ? [{ title: "저장 후 이동", click: () => resolve("saveThenGo") }] : [])
        ],
      });
    });
  }, [modal]);

  // 현재 탭 저장 실행 => 성공(true)만 이동 허용
  const saveTab = useCallback(async (tab) => {
    if (tab === "1") {
      const ret = tab1Ref.current?.saveChanges?.();
      return ret && typeof ret.then === "function" ? !!(await ret) : false;
    }
    if (tab === "2") {
      const ret = tab2Ref.current?.saveChanges?.();
      return ret && typeof ret.then === "function" ? !!(await ret) : false;
    }
    return false; // 탭3은 저장 없음
  }, []);

  const trySwitchTab = useCallback(async (next) => {
    if (next === tabDivision) return;

    const cur = tabDivision;
    const curDirty =
      cur === "2"
        ? (unsaved["2"] || (lvCodeDraft?.value !== lvCodeCommitted?.value))
        : unsaved[cur];

    if (curDirty) {
      const action = await confirmNavigate(
        "저장하지 않은 변경 사항이 있습니다.\n이동하시겠습니까?",
        /* canSave */(cur === "1" || cur === "2")
      );

      if (action === "cancel") return;

      if (action === "go") {
        // 버리고 이동
        setUnsaved(prev => ({ ...prev, [cur]: false }));
        setLvCodeDraft(lvCodeCommitted); // 단계 변경도 롤백
        stageHistRef.current = { back: [lvCodeCommitted], fwd: [] }; // 히스토리도 롤백
        setTabDivision(next);
        return;
      }

      if (action === "saveThenGo") {
        const ok = await saveTab(cur);      // ← 저장 API 실행
        if (!ok) return;                    // 실패면 그대로 머무름

        // 성공: 더티 플래그 해제 + (탭2면) 드롭다운 커밋
        setUnsaved(prev => ({ ...prev, [cur]: false }));
        if (cur === "2") setLvCodeCommitted(lvCodeDraft);

        setTabDivision(next);
        return;
      }
    } else {
      setTabDivision(next);
    }
  }, [tabDivision, unsaved, confirmNavigate, lvCodeCommitted, lvCodeDraft, saveTab]);

  // 새로고침/창닫기 가드 (브라우저 네이티브)
  useEffect(() => {
    const handler = (e) => {
      const stageDirty = tabDivision === "2" && (lvCodeDraft?.value !== lvCodeCommitted?.value);
      const anyDirty = Object.values(unsaved).some(Boolean) || stageDirty;
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = ""; // 크롬/사파리 경고 표시 트리거
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved, tabDivision, lvCodeDraft, lvCodeCommitted]);

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

  // 단계 드롭다운 전용 Ctrl+Z/Y (드롭다운에 포커스 있을 때만)
  useEffect(() => {
    const isStageDropdownFocused = () => {
      const ae = document.activeElement;
      return !!(ae && ae.closest && ae.closest(".k-dropdownlist"));
    };

    const onKey = (e) => {
      if (tabDivision !== "2") return;
      const key = e.key?.toLowerCase?.();
      if (!key) return;

      // 드롭다운 포커스 아닐 땐 패스 (그리드 undo와 충돌 방지)
      if (!isStageDropdownFocused()) return;

      const h = stageHistRef.current;

      // Undo
      if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
        if (h.back.length > 1) {
          e.preventDefault();
          const cur = h.back.pop();           // 현재
          h.fwd.push(cur);                    // redo 스택에 푸시
          const prev = h.back[h.back.length - 1]; // 이전 상태
          setLvCodeDraft(prev);
          setUnsaved(u => ({ ...u, ["2"]: prev.value !== lvCodeCommitted.value }));
        }
      }
      // Redo
      else if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
        if (h.fwd.length > 0) {
          e.preventDefault();
          const next = h.fwd.pop();
          h.back.push(next);
          setLvCodeDraft(next);
          setUnsaved(u => ({ ...u, ["2"]: next.value !== lvCodeCommitted.value }));
        }
      }
    };

    window.addEventListener("keydown", onKey, true); // capture=true
    return () => window.removeEventListener("keydown", onKey, true);
  }, [tabDivision, lvCodeCommitted]);

  // 보기불러오기 탭 클릭 시 새창 띄우기 
  const openExloadWindow = useCallback(() => {
    const params = new URLSearchParams({
      projectnum: projectnum ?? "",
      qnum: (qnum ?? "") + "",
      lv: lvCodeDraft?.value ?? "1",
    });
    const url = `${window.location.origin}/viewer?${params.toString()}`;
    openCenteredPopup(url);
  }, [projectnum, qnum, lvCodeDraft]);

  // Tab1 → Body로 패널 열기 요청
  const [currentCodeIds, setCurrentCodeIds] = useState([]);

  // 보기불러오기 등록 완료 -> 창 닫힌 후 보기데이터 탭 이동, 재조회  
  useEffect(() => {
    const handleMessage = (e) => {
      // 동일 출처만 허용
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "EXLOAD_REGISTER_SUCCESS") {
        // 탭2로 이동
        setTabDivision("2");
        // 탭2 데이터 재조회
        tab2Ref.current?.reload?.();
        // 보기불러오기 성공 후 Lv3 코드 다시 조회
        fetchLv3Options();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  //-----------------소분류 코드 중앙 관리-----------------
  const { optionEditData } = OptionSettingApi();
  const fetchLv3Options = useCallback(async () => {
    try {
      const res = await optionEditData.mutateAsync({
        params: {
          user: auth?.user?.userId || "",
          projectnum,
          qnum,
          gb: "lb",
        },
      });

      const seen = new Set();
      const list = (res?.resultjson ?? []).reduce((acc, r) => {
        const lv3 = (r?.lv3 ?? "").trim();
        const lv123code = (r?.lv123code ?? "").trim();
        if (!lv3 || seen.has(lv3)) return acc;
        seen.add(lv3);
        acc.push({
          codeId: lv123code,
          codeName: lv3,
          lv1: r?.lv1 ?? "",
          lv2: r?.lv2 ?? "",
          lv1code: r?.lv1code ?? "",
          lv2code: r?.lv2code ?? "",
          lv123code: r?.lv123code ?? "",
          ex_gubun: r?.ex_gubun ?? "",    // Info 쪽에서 필요
        });
        return acc;
      }, []);
      setLv3Options(list);
      return { resultjson: list };
    } catch (err) {
      console.error("lv3 fetch error", err);
      throw err;
    }
  }, [optionEditData, projectnum, qnum]);

  useEffect(() => {
    // 최초 1회 호출 
    fetchLv3Options();
  }, []);
  //-----------------소분류 코드 중앙 관리-----------------
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

          {tabDivision === "1" && (
            <div className="btnWrap">
              <GridHeaderBtnPrimary disabled={!canSave["1"]} onClick={onTab1SaveClick}>저장</GridHeaderBtnPrimary>
            </div>
          )}
          {tabDivision === "2" && (
            <div className="btnWrap">
              <GridHeaderBtnPrimary disabled={!(canSave["2"] || stageChanged)} onClick={onTab2SaveClick}>저장</GridHeaderBtnPrimary>
            </div>
          )}
        </div>
      </article>

      {/* 왼쪽 패널이 닫히면 부모에 left-closed 클래스 부여 */}
      <article className={`subContWrap ${isLeftOpen ? "" : "left-closed"}`}>
        <div className="subCont subContL">
          <OptionSettingInfo
            isOpen={isLeftOpen}
            projectnum={projectnum}
            qnum={qnum}
            onToggle={() => setIsLeftOpen(v => !v)}
            showEmptyEtcBtn={analysisCount !== 0}
            onNavigateTab={useCallback((nextTab) => {
              // 항상 최신 상태로 비교되도록 콜백화
              setTabDivision((prev) => {
                if (prev === nextTab) {
                  if (nextTab === "1") tab1Ref.current?.reload?.();
                  else if (nextTab === "2") tab2Ref.current?.reload?.();
                  return prev; // 유지
                }
                return nextTab;
              });
            }, [])}
            userPerm={state?.userPerm}  // 권한 체크 
            lv3Options={lv3Options}
            responseCount={responseCount}
          />
        </div>

        <div className="subCont subContR">
          <div className="btnBox tabMenu mgB12">
            <Button className={tabDivision === "1" ? "btnTab on" : "btnTab"} onClick={() => trySwitchTab("1")}>
              응답 데이터
            </Button>
            <Button className={tabDivision === "2" ? "btnTab on" : "btnTab"} onClick={() => trySwitchTab("2")}>
              보기 데이터
            </Button>
            <Button className={tabDivision === "3" ? "btnTab on" : "btnTab"} onClick={() => trySwitchTab("3")}>
              rawdata
            </Button>
            <Button
              style={{
                border: "1px solid #afb6b2",
                borderRadius: "8px",
                color: "#69706d",
                fontSize: "15px",
                fontWeight: 500,
                background: "#fff",
                height: "36px",
              }}
              onClick={openExloadWindow}>
              보기 불러오기
            </Button>
            <DropDownList
              style={{ width: 140 }}
              data={LVCODE_OPTION}
              dataItemKey="value"
              textField="text"
              value={lvCodeDraft}
              disabled={tabDivision !== "2"}           //탭2에서 활성화
              onChange={(e) => {
                if (tabDivision === "2") {
                  const next = e.value;
                  setLvCodeDraft(next);
                  setUnsaved(prev => ({ ...prev, [tabDivision]: next?.value !== lvCodeCommitted?.value }));
                  // 히스토리에 현재 선택을 push (중복 방지)
                  const h = stageHistRef.current;
                  const last = h.back[h.back.length - 1];
                  if (!last || last.value !== next.value) {
                    h.back.push(next);
                    h.fwd.length = 0;
                  }
                }
              }}
            />
          </div>
          <div className="gridWithPanel">
            <div className="grid-area">
              {tabDivision === "1" ? (
                <OptionSettingTab1
                  ref={tab1Ref}
                  projectnum={projectnum}
                  qnum={qnum}
                  lvCode={lvCodeDraft.value}
                  onInitLvCode={handleInitLvCode}
                  onSaved={() => {
                    // 저장 성공 → 더티 해제
                    markUnsaved("1", false);
                  }}
                  onInitialAnalysisCount={(n) => setAnalysisCount(n)} //최초 분석값 존재 여부 확인
                  onUnsavedChange={defer((v) => markUnsaved("1", v))}
                  onHasEditLogChange={defer((v) => setCanSave(prev => ({ ...prev, "1": !!v })))}
                  persistedPrefs={gridPrefs["1"]}
                  onPrefsChange={defer((patch) => updateGridPrefs("1", patch))}
                  lv3Options={lv3Options}    // 패널에서 가져온 리스트 내려줌
                  onRequestLv3Refresh={fetchLv3Options}
                  onOpenLv3Panel={(...args) => {
                    handleOpenLv3Panel(...args);
                  }}
                  onResponseCountChange={setResponseCount} 
                />
              ) : tabDivision === "2" ? (
                <OptionSettingTab2
                  ref={tab2Ref}
                  projectnum={projectnum}
                  qnum={qnum}
                  lvCode={lvCodeDraft.value}
                  onSaved={() => {
                    // 저장 성공 → 더티 해제 + 단계 커밋
                    markUnsaved("2", false);
                    setLvCodeCommitted(lvCodeDraft);
                    // 저장된 값을 기준으로 히스토리 재설정
                    stageHistRef.current = { back: [lvCodeDraft], fwd: [] };
                  }}
                  onUnsavedChange={defer((v) => markUnsaved("2", v))}
                  onHasEditLogChange={defer((v) => setCanSave(prev => ({ ...prev, "2": !!v })))}
                  persistedPrefs={gridPrefs["2"]}
                  onPrefsChange={defer((patch) => updateGridPrefs("2", patch))}
                />
              ) : <OptionSettingTab3
                lvCode={lvCodeDraft.value}
                projectnum={projectnum}
                qnum={qnum}
                persistedPrefs={gridPrefs["3"]}
                onPrefsChange={defer((patch) => updateGridPrefs("3", patch))}
              />
              }
            </div>
            {tabDivision === "1" &&
              <OptionSettingLv3Panel
                open={isLv3PanelOpen}
                onClose={(next) => setIsLv3PanelOpen(next)}
                projectnum={projectnum}
                qnum={qnum}
                targets={lv3Targets}
                currentCodeIds={currentCodeIds}
                onOptionsLoaded={(list) => setLv3Options(list)}
                onApply={async (targets, opt) => {
                  tab1Ref.current?.applyLv3To?.(targets, opt);
                  setIsLv3PanelOpen(false);
                  await fetchLv3Options();
                }}
                options={lv3Options}                      // 소분류 코드 
                onRequestLv3Refresh={fetchLv3Options}
              />
            }
          </div>
        </div>
      </article>
    </Fragment>
  );
};

export default OptionSettingBody;
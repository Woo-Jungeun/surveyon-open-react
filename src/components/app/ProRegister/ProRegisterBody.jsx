import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import ProRegisterTab1 from "@/components/app/proRegister/ProRegisterTab1";
import ProRegisterTab2 from "@/components/app/proRegister/ProRegisterTab2";
import { modalContext } from "@/components/common/Modal.jsx";


/**
 * 문항 등록 > Body
 * 
 * @author jewoo
 * @since 2025-09-29<br />
 */
const ProRegisterBody = () => {
  const servername = sessionStorage.getItem("servername");

  // servername이 NEW가 아닐 경우만 DB탭 표출 
  const [tabDivision, setTabDivision] = useState(() => {
    return servername !== "NEW" ? "1" : "2";
  });

  return (
    <Fragment>
      <article className="subTitWrap">
        <div className="subTit">
          <h2 className="titTxt">문항 등록</h2>
        </div>
      </article>

      <article className={`subContWrap`}>
        <div className="subCont">
          <div className="btnBox tabMenu  ">
            {servername !== "NEW" &&
              <Button className={tabDivision === "1" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("1")}>
                DB
              </Button>
            }
            <Button className={tabDivision === "2" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("2")}>
              Excel
            </Button>
          </div>

          {tabDivision === "1" ? (
            <ProRegisterTab1
            />
          ) :
            <ProRegisterTab2
            />
          }
        </div>
      </article>
    </Fragment>
  );
};

export default ProRegisterBody;
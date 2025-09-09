import PopupInput from "@/components/common/popup/PopupInput.jsx";
import {useContext} from "react";
import {modalContext} from "@/components/common/Modal";
import {Button} from "@progress/kendo-react-buttons";
import {LoginApi} from "@/components/app/login/LoginApi.js";
import PopupCellPhoneInput from "@/components/common/popup/PopupCellphoneInput.jsx";
import PopupPhoneInput from "@/components/common/popup/PopupPhoneInput.jsx";
import PopupRadioButton from "@/components/common/popup/PopupRadioButton.jsx";

const MyPagePopup = (parentProps) => {
    const { updateMyInfoMutation} = LoginApi();

    const modalOnOff = parentProps.popupShow === true ? "on" : "off";  //className
    const modal = useContext(modalContext);

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSave();
    };

    const handleCancelButton = () => {
        parentProps.setPopupShow(false);
        parentProps.setPopupValue({});
    };

    const handleSave = () => {
        const payload = parentProps.popupValue;

        modal.showReqConfirm("내 정보", "U", async () => {
            const res = await updateMyInfoMutation.mutateAsync(payload);
            if (res?.status == "NS_OK") {
                modal.showAlert("알림", res.message);   // 성공 팝업 표출
                handleCancelButton();
            } else {
                modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
            }
        });
    };

    return (
        <article className={`modal ${modalOnOff}`}>
            <div className="cmn_popup">
                <div className="popTit">
                    <h3>마이페이지</h3>
                    <a className="btnClose" onClick={handleCancelButton}><span
                        className="hidden">close</span></a>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="popCont">
                        <div className="popTbl type02">
                            <table className="tbl">
                                <colgroup>
                                    <col width="600px"/>
                                </colgroup>
                                <tbody>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                label={"사용자 ID"}
                                                name={"userId"}
                                                parentProps={parentProps}
                                                required={false}
                                                disabled={true}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                label={"사용자 이름"}
                                                name={"userName"}
                                                parentProps={parentProps}
                                                required={true}
                                                maxByte={100}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                label={"권한"}
                                                name={"authorityName"}
                                                parentProps={parentProps}
                                                required={false}
                                                disabled={true}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <span className="iptTit">전화번호</span>
                                            <PopupPhoneInput name={"telephoneNumber"}
                                                             parentProps={parentProps}
                                                             maxByte={30}/>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <span className="iptTit">휴대폰 번호</span>
                                            <PopupCellPhoneInput name={"mobilePhoneNumber"}
                                                                 parentProps={parentProps}
                                                                 maxByte={30}/>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                label={"부서"}
                                                name={"department"}
                                                parentProps={parentProps}
                                                required={false}
                                                maxByte={50}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                label={"직책"}
                                                name={"jobTitle"}
                                                parentProps={parentProps}
                                                required={false}
                                                maxByte={50}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <span className="iptTit">SMS 수신여부</span>
                                            <div className="radioBox">
                                                <PopupRadioButton label={"수신"}
                                                                  name={"smsReceivingYn"}
                                                                  id={"smsReceivingY"}
                                                                  value={"Y"}
                                                                  parentProps={parentProps}
                                                                  checked={parentProps.popupValue?.smsReceivingYn == "Y"}/>
                                                <PopupRadioButton label={"거부"}
                                                                  name={"smsReceivingYn"}
                                                                  id={"smsReceivingN"}
                                                                  value={"N"}
                                                                  parentProps={parentProps}
                                                                  checked={parentProps.popupValue?.smsReceivingYn == "N"}/>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="popBtn">
                        <div className="btnWrap">
                            <Button className={"btnL btnTxt type01"}
                                    onClick={handleCancelButton}>취소</Button>
                            <Button type={"submit"} className={"btnL"} themeColor={"primary"}>적용</Button>
                        </div>
                    </div>
                </form>
            </div>

        </article>
    );
};

export default MyPagePopup;

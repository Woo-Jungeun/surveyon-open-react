import PopupInput from "@/components/common/popup/PopupInput.jsx";
import {EngNumSpecValidatedInput} from "@/common/utils/Validation.jsx";
import {useContext, useEffect, useState} from "react";
import {modalContext} from "@/components/common/Modal";
import {Button} from "@progress/kendo-react-buttons";
import {LoginApi} from "@/components/app/login/LoginApi.js";
const PasswordSettingPopup = (parentProps) => {

    const {updatePasswordMutation} = LoginApi();

    const modalOnOff = parentProps.popupShow === true ? "on" : "off";  //className
    const modal = useContext(modalContext);
    const payload = parentProps.popupValue;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (valiCheck1 === true || valiCheck2 === true) {
            return;
        }
        handleSave();
    };

    const handleCancelButton = () => {
        parentProps.setPopupShow(false);
        parentProps.setPopupValue({});
    };

    const newPw1 = parentProps?.popupValue?.newPassword1;
    const newPw2 = parentProps?.popupValue?.newPassword2;

    /*유효성 체크 내용 표출 여부*/
    const [valiCheck1, setValiCheck1]=useState(null);
    const [valiCheck2, setValiCheck2]=useState(null);

    useEffect(() => {
        // 초기화
        setValiCheck1(false)
        setValiCheck2(false)

        if (valiCheck1 !== null && valiCheck2 !== null) {
            if (!EngNumSpecValidatedInput(payload.newPassword1)) {
                setValiCheck1(true);
                return;
            }
            if (payload.newPassword1 !== payload.newPassword2) {
                setValiCheck2(true)
                return;
            }
        }

    }, [parentProps.popupValue.newPassword1, parentProps.popupValue.newPassword2]);

    const handleSave = () => {
        /* 유효성 체크 */
        if (payload.password === payload?.newPassword2) {
            modal.showAlert("알림", "기존 비밀번호와 신규 비밀번호가 일치합니다.");
            return;
        }

        modal.showReqConfirm("비밀번호", "U", async () => {
            const res = await updatePasswordMutation.mutateAsync(payload);
            if (res?.status == "NS_OK") {
                handleCancelButton();
            }
        });
    };

    return (
        <article className={`modal ${modalOnOff}`}>
            <div className="cmn_popup">
                <div className="popTit">
                    <h3>비밀번호 변경</h3>
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
                                                type={"password"}
                                                label={"이전 비밀번호"}
                                                name={"password"}
                                                parentProps={parentProps}
                                                required={true}
                                                placeholder={"이전 비밀번호를 입력해 주세요"}
                                                maxLength={20}
                                                maxByte={50}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                type={"password"}
                                                label={"신규 비밀번호"}
                                                name={"newPassword1"}
                                                parentProps={parentProps}
                                                required={true}
                                                placeholder={"새로운 비밀번호를 입력해 주세요"}
                                                maxLength={20}
                                                maxByte={50}
                                            />
                                        </div>
                                        {newPw1 !== null && valiCheck1 && <p className={'iptCmt'}>비밀번호는 영소문자+숫자+특수문자(@$!%*#?&) 포함 8-20자로 입력해주세요.</p>}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="cmn_pop_ipt">
                                            <PopupInput
                                                type={"password"}
                                                label={"신규 비밀번호 확인"}
                                                name={"newPassword2"}
                                                parentProps={parentProps}
                                                required={true}
                                                placeholder={"비밀번호를 확인해 주세요"}
                                                maxLength={20}
                                                maxByte={50}
                                            />
                                        </div>
                                        {newPw2 !== null && valiCheck2 && <p className={'iptCmt'}>비밀번호가 일치하지 않습니다. 입력하신 내용을 확인해주세요.</p>}
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
                            <Button type={"submit"} className={"btnL"} themeColor={"primary"}>변경</Button>
                        </div>
                    </div>
                </form>
            </div>

        </article>
    );
};

export default PasswordSettingPopup;

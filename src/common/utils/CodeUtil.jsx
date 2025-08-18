import api from "@/common/queries/Api.js";

/**
 * 코드를 가져와서 lcoalStorage에 담음.
 * @author jisu
 * @since 2024.04.30
 */
export const loadCode = async () => {
    const result = await api.post(null, "/v1/code/all/search");
    localStorage.setItem("code", JSON.stringify(result?.items ?? []));
    return result.items;
};

/**
 * searchCombo YN인 경우 넣을 데이터 return
 * @author jisu
 * @since 2024.05.02
 */
export const useYnComboData = [
    { codeId: "Y", codeName: "Y" },
    { codeId: "N", codeName: "N" }
];

/**
 * searchCombo systemCode 구분값 데이터 return
 * @author jewoo
 * @since 2024.05.02
 */
export const systemCodeComboData = [
    { codeId: "BMS", codeName: "BMS" },
    { codeId: "BIS", codeName: "BIS" },
    { codeId: "RM", codeName: "RM" }
];

export const endprodComboData = [
    { codeId: "N", codeName: "N" },
    { codeId: "1년", codeName: "1년" },
    { codeId: "2년", codeName: "2년" },
    { codeId: "교체필요", codeName: "교체필요" }
];
/**
 * searchCombo timeComboData 구분값 데이터 return
 * @author jewoo
 * @since 2024.06.03
 */
export const timeComboData = [
    { codeId: "000000,005959", codeName: "00시" },
    { codeId: "010000,015959", codeName: "01시" },
    { codeId: "020000,025959", codeName: "02시" },
    { codeId: "030000,035959", codeName: "03시" },
    { codeId: "040000,045959", codeName: "04시" },
    { codeId: "050000,055959", codeName: "05시" },
    { codeId: "060000,065959", codeName: "06시" },
    { codeId: "070000,075959", codeName: "07시" },
    { codeId: "080000,085959", codeName: "08시" },
    { codeId: "090000,095959", codeName: "09시" },
    { codeId: "100000,105959", codeName: "10시" },
    { codeId: "110000,115959", codeName: "11시" },
    { codeId: "120000,125959", codeName: "12시" },
    { codeId: "130000,135959", codeName: "13시" },
    { codeId: "140000,145959", codeName: "14시" },
    { codeId: "150000,155959", codeName: "15시" },
    { codeId: "160000,165959", codeName: "16시" },
    { codeId: "170000,175959", codeName: "17시" },
    { codeId: "180000,185959", codeName: "18시" },
    { codeId: "190000,195959", codeName: "19시" },
    { codeId: "200000,205959", codeName: "20시" },
    { codeId: "210000,215959", codeName: "21시" },
    { codeId: "220000,225959", codeName: "22시" },
    { codeId: "230000,235959", codeName: "23시" }
];

/**
 * @author dhwon
 * @since 2024.06.13
 */
export const dbTypeComboData = [
    {codeId:"edit",codeName:"편집"},
    {codeId:"operation",codeName:"운영"},
    {codeId:"backup",codeName:"백업"},
];
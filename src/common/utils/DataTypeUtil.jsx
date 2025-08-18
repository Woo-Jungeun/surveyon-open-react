/**
 * @funcName : getFileSize
 * @description : 파일 사이즈 변환
 * @return :
 * @exception :
 * @date : 2024-03-22 오후 5:19
 * @author :
 * @see
 * @history :
 * @param size: 파일 크기
 * @param type: 파일 타입
 **/
export const getFileSize = (size, type) => {
    const _type = type.toLowerCase();
    let _size = size;
    switch (_type) {
        case "kb":
            _size = size / 1024 ** 1;
            break;
        case "mb":
            _size = size / 1024 ** 2;
            break;
        case "gb":
            _size = size / 1024 ** 3;
            break;
        case "tb":
            _size = size / 1024 ** 4;
            break;
        default:
            _size = size / 1024 ** 1;
            break;
    }
    return _size;
};
/**
 * @funcName : getFormData
 * @description : Form에서 데이터를 가져온다.
 * @param form : form 엘리먼트
 * @return :
 * @exception :
 * @date : 2021-05-14 오후 5:19
 * @author : chauki
 * @see
 * @history :
 **/
export const getFormData = (form) => {
    let field,
        params = {};
    if (typeof form == "object" && form.nodeName === "FORM") {
        let len = form.elements.length;
        for (let i = 0; i < len; i++) {
            field = form.elements[i];
            if (
                field.name &&
                !field.disabled &&
                field.type !== "file" &&
                field.type !== "reset" &&
                field.type !== "submit" &&
                field.type !== "button"
            ) {
                if (field.type === "select-multiple") {
                    for (let j = form.elements[i].options.length - 1; j >= 0; j--) {
                        if (field.options[j].selected) {
                            if (encodeURIComponent(field.options[j].value !== "")) {
                                params[encodeURIComponent(field.name)] = encodeURIComponent(field.options[j].value);
                            }
                        }
                    }
                } else if ((field.type !== "checkbox" && field.type !== "radio") || field.checked) {
                    if (encodeURIComponent(field.value) !== "") {
                        params[encodeURIComponent(field.name)] = encodeURIComponent(field.value);
                    }
                }
            }
        }
    }
    return params;
};

/**
 * @funcName : setInitialValueForHash
 * @description : Hash Map 형태의 값을 초기화한다.
 * @param targetData : string 데이터
 * @param fieldName : 변수명(key 값)
 * @param initialValue : string
 * @return :
 * @exception :
 * @date : 2021-05-31 오전 9:08
 * @author : chauki
 * @see
 * @history :
 **/
export const setInitialValueForHash = (targetData, fieldName, initialValue) => {
    if (targetData === undefined || targetData === null) {
        if (initialValue !== undefined) {
            return initialValue;
        }
        return null;
    }
    if (initialValue === undefined) {
        initialValue = null;
    }
    return targetData[fieldName] !== undefined && targetData[fieldName] !== null ? targetData[fieldName] : initialValue;
};

/**
 * @funcName : setInitialValueForString
 * @description : String 형태의 값을 초기화한다.
 * @param value : 값
 * @param initialValue : string
 * @return :
 * @exception :
 * @date : 2021-12-14 오후 12:08
 * @author : parksujin
 * @see
 * @history :
 **/
export const setInitialValueForString = (value, initialValue) => {
    if (value === undefined || value === null) {
        if (initialValue !== undefined) {
            return initialValue;
        }
        return null;
    }
    if (initialValue === undefined) {
        initialValue = null;
    }
    return value !== undefined && value !== null ? value : initialValue;
};

/**
 * @funcName : randomIntFromInterval
 * @description : min ~ max 까지 랜덤 숫자를 리턴한다.
 * @param min : 최소값
 * @param max : 최대값
 * @date : 2021-12-23 오후 6:05
 * @author : chauki
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const randomIntFromInterval = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * @funcName : getRandomColor
 * @description : 컬러 랜덤 지정
 * @param index :
 * @date : 2022-01-25 오전 10:13
 * @author : khlee
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const getRandomColor = (index) => {
    const colors = [
        "#b9e047"
        , "#63c38a"
        , "#159ebc"
        , "#46b1fe"
        , "#1472ff"
        , "#9390ff"
        , "#6d26e1"
        , "#c948d5"
        , "#af3b80"
        , "#ff7ba3"
        , "#ffa2a2"
        , "#f44e4e"
        , "#ff8024"
        , "#ffca41"
        , "#f2ea24"
    ];
    return colors[index % 15];
};

/**
 * @funcName : menuTreeSet
 * @description : 메뉴트리 셋팅
 * @date : 2024-02-14 오후 15:13
 * @author :
 * @version : 1.0.0
 * @see
 * @history :
 * @param authMenuList
 **/
export const menuTreeSet = (authMenuList) => {
    const upperMenuList = authMenuList
        .map((menu, idx) => {
            if (menu["upperMenuId"] === null) {
                return {
                    menuId: menu["menuId"],
                    menuName: menu["menuName"],
                    menuSequenceNumber: menu["menuSequenceNumber"],
                    upperMenuId: menu["upperMenuId"],
                    menuUrl: menu["menuUrl"],
                    useYn: menu["useYn"],
                    systemCode: menu["systemCode"],
                    remark:  menu["remark"],
                    childMenu: []
                };
            }
        })
        .filter((it) => it !== undefined)
        .sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));

    // 상위 메뉴 첫번째 Deps 구현
    authMenuList.map((menu) => {
        if (menu["upperMenuId"] !== null) {
            upperMenuList.map((upperMenu) => {
                if (upperMenu["menuId"] === menu["upperMenuId"]) {
                    upperMenu["childMenu"].push({
                        menuId: menu["menuId"],
                        menuName: menu["menuName"],
                        menuSequenceNumber: menu["menuSequenceNumber"],
                        upperMenuId: menu["upperMenuId"],
                        menuUrl: menu["menuUrl"],
                        useYn: menu["useYn"],
                        systemCode: menu["systemCode"],
                        remark:  menu["remark"],
                        childMenu: []
                    });
                }
                return upperMenu;
            });
        }
    });

    // 3depth
    upperMenuList
        .map((upperMenu) => {
            if (upperMenu["childMenu"] !== null) {
                upperMenu["childMenu"].map((childMenu) => {
                    authMenuList.map((authMenu) => {
                        if (childMenu["menuId"] === authMenu["upperMenuId"]) {
                            childMenu["childMenu"].push(authMenu);
                        }
                    });
                });
            }
        })
        .filter((it) => it !== undefined)
        .sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));

    // Child Menu Sort
    for (let upperMenuListElement of upperMenuList) {
        upperMenuListElement["childMenu"].sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));
        for (let upperChildMenuListElement of upperMenuListElement.childMenu) {
            upperChildMenuListElement["childMenu"].sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));
        }
    }
    return upperMenuList;
};

/**
 * @funcName : menuListToTreeViewData
 * @description : 메뉴트리를 checkbox가 있는 트리뷰 구조에 맞게 데이터 변환
 * @date : 2024-05-03
 * @author : jisu
 * @param authMenuList
 **/
export const menuListToTreeViewData = (authMenuList) => {
    const upperMenuList = authMenuList
        .map((menu, idx) => {
            if (menu["upperMenuId"] === null) {
                return {
                    menuId: menu["menuId"],
                    menuName: menu["menuName"],
                    menuSequenceNumber: menu["menuSequenceNumber"],
                    upperMenuId: menu["upperMenuId"],
                    menuUrl: menu["menuUrl"],
                    useYn: menu["useYn"],
                    systemCode: menu["systemCode"],
                    remark:  menu["remark"],
                    items: []
                };
            }
        })
        .filter((it) => it !== undefined)
        .sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));

    // 상위 메뉴 첫번째 Deps 구현
    authMenuList.map((menu) => {
        if (menu["upperMenuId"] !== null) {
            upperMenuList.map((upperMenu) => {
                if (upperMenu["menuId"] === menu["upperMenuId"]) {
                    upperMenu["items"].push({
                        menuId: menu["menuId"],
                        menuName: menu["menuName"],
                        menuSequenceNumber: menu["menuSequenceNumber"],
                        upperMenuId: menu["upperMenuId"],
                        menuUrl: menu["menuUrl"],
                        useYn: menu["useYn"],
                        systemCode: menu["systemCode"],
                        remark:  menu["remark"],
                        items: []
                    });
                }
                return upperMenu;
            });
        }
    });

    // 3depth
    upperMenuList
        .map((upperMenu) => {
            if (upperMenu["items"] !== null) {
                upperMenu["items"].map((items) => {
                    authMenuList.map((authMenu) => {
                        if (items["menuId"] === authMenu["upperMenuId"]) {
                            items["items"].push(authMenu);
                        }
                    });
                });
            }
        })
        .filter((it) => it !== undefined)
        .sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));

    // Child Menu Sort
    for (let upperMenuListElement of upperMenuList) {
        upperMenuListElement["items"].sort((a, b) => (a["menuSequenceNumber"] > b["menuSequenceNumber"] ? 1 : -1));
    }
    return upperMenuList;
};

/**
 * tree data중에서 checkbox가 체크된 데이터만 뽑음
 *
 * ex)
 * const onProcessDataChange = (processedTreeData) => {
 *   getChecked(processedTreeData)
 * }
 *
 * @param data tree data Array
 * @returns {[]}
 */
export const getCheckedTreeData = (data) => {
    const checkedArr = [];
    const getItems = (value) => {
        if (Array.isArray(value)) {
            value.forEach((item) => getItems(item));
        } else if (value instanceof Object) {
            if (value?.checked) {
                checkedArr.push(value);
            }
            if (value?.items?.length > 0) {
                getItems(value.items);
            }
        } else {
            return null;
        }
    };
    getItems(data);
    return checkedArr;
}

/**
 * origin에 setting을 비교하여 setting의 값을 덮어 씌운다.
 * ex)
 * origin = [{menuId : 1}, {menuId : 2}]
 * key = "menuId
 * setting = [{menuId : 1, checked: true}]
 * returns = [{menuId : 1, checked: true}, {menuId : 2}]
 * @param origin 원본 트리 데이터 배열
 * @param key 데이터 비교의 기준이 되는 키. origin과 setting에 모두 유일한 값으로 들어있어야 함.
 * @param setting 덮어씌울 값이 들어있는 배열
 * @returns {[]}
 */
export const setTreeDataSetting = (origin, setting, key) => {
    const process = (originArr, targetObj, key) => {
        const processItem = (value, target, key) => {
            if (Array.isArray(value)) {
                value.forEach((item) => processItem(item, target, key));
            } else if (value instanceof Object) {
                if (value[key] == target[key]) {
                    const copy = { ...value, ...target };
                    Object.entries(copy).forEach(([key, val]) => {
                        value = value[key] = val;
                    });
                    return null;
                } else {
                    if (value?.items?.length > 0) {
                        processItem(value.items, target, key);
                    } else {
                        return null;
                    }
                }
            } else {
                return null;
            }
        };
        processItem(originArr, targetObj, key)
    }

    setting.forEach(obj => process(origin, obj, key));
    return origin;
}

/**
 * 메뉴 depths 별 menuName 리스트
 * menu : 대메뉴정보 , pathname : 현재 페이지 url
 * @author jewoo
 * @since 2024-04-29<br />
 */

export const menuTitle = (oneDepthsMenu, pathname) => {
    const titleList = [];
    let twoDepthsMenuName = "";
    let threeDepthsMenuName = "";

    if (oneDepthsMenu) {
        const twoDepths = oneDepthsMenu?.childMenu?.filter(i => i.menuUrl === pathname);

        if (twoDepths.length !== 0) {
            // 마지막 depths가 2depths일 경우
            twoDepthsMenuName = twoDepths[0].menuName;
        } else {
            // 마지막 depths가 3depths일 경우
            oneDepthsMenu.childMenu.map((twoDepthMenu) => {
                if (twoDepthMenu.childMenu.length !== 0) {
                    const threeDepths = twoDepthMenu?.childMenu?.filter(i => i.length !== 0 ? i.menuUrl === pathname : '');
                    if (threeDepths.length !== 0) {
                        twoDepthsMenuName = twoDepthMenu.menuName;
                        threeDepthsMenuName = threeDepths[0].menuName;
                    }
                }
            })
        }

    }

    titleList.push(oneDepthsMenu.menuName, twoDepthsMenuName, threeDepthsMenuName);
    return titleList;
};

/**
 * @funcName : replaceThsComma
 * @description : 천단위 콤마
 * @date : 2024-02-16 오후 15:13
 * @author :
 * @version : 1.0.0
 * @see
 * @history :
 * @param price
 * @param defaultValue
 **/
export const replaceThsComma = (price, defaultValue) => {
    if (defaultValue !== undefined) {
        if (price === 0) return defaultValue;
    }
    let tempPrice = price?.toString().replaceAll(',', '');

    return tempPrice?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};


/**
 * object의 데이터를 formData에 담아서 return
 *
 * @author jisu
 * @since 2024.05.17
 * @param obj object
 * @returns {FormData}
 */
export const objectToForm = (obj) => {
    const formData = new FormData();
    Object.keys(obj).forEach((key) => {
        if(obj[key] != null) {
            if(obj[key] instanceof Array) {
                for(const item of obj[key]) {
                    formData.append(key, item)
                }
            } else {
                formData.append(key, obj[key])
            }
        }
    });
    return formData;
}
/**
 * d-day 계산
 *
 * @author jewoo
 * @since 2024.06.05
 * @param date 계산할 날짜 데이터
 */
export const dDayForm = (date) => {
    const YMDFormatter= (num) => { {
        if (!num) return "";

        var formatNum = '';
        // 공백제거
        num = num.replace(/\s/gi, "");

        try {
            if (num.length == 8) {

                formatNum = num.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            }
        } catch (e) {
            formatNum = num;
            //console.log(e);
        }
        return formatNum;
    }};

    const setDate = new Date(YMDFormatter(date));
    const now = new Date();
    const distance = setDate.getTime() - now.getTime();

    return Math.floor(distance / (1000 * 60 * 60 * 24)) + 1;
};

export const changeRgba = (orig) => {
    let a, isPercent,
        rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
        alpha = (rgb && rgb[4] || "").trim(),
        hex = rgb ? "#" +
            (rgb[1] | 1 << 8).toString(16).slice(1) +
            (rgb[2] | 1 << 8).toString(16).slice(1) +
            (rgb[3] | 1 << 8).toString(16).slice(1) : orig;
    if (alpha !== "") {
        isPercent = alpha.indexOf("%") > -1;
        a = parseFloat(alpha);
        if (!isPercent && a >= 0 && a <= 1) {
            a = Math.round(255 * a);
        } else if (isPercent && a >= 0 && a <= 100) {
            a = Math.round(255 * a / 100)
        } else {
            a = "";
        }
    }
    if (a) {
        hex += (a | 1 << 8).toString(16).slice(1);
    }
    return hex;
}
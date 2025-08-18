import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

export const ComboApi = () => {
    /*운수사 ID 콤보 조회*/
    const getCompanyIdMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/company-id/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*운영중인 운수사*/
    const getOpenCompanyIdMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/company-id/open/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );



    /*OBU 정보 콤보 조회*/
    const getObuIdMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/obu-id/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*배차 코스 번호 콤보 조회*/
    const getAllocationOfCarsCourseNumberMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/allocation-of-cars-course-number/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*노선 번호 콤보 조회(operation)*/
    const getRouteNumberMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/route-number/operation/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*노선 번호 콤보 조회 (edit)*/
    const getRouteNumberEditMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/route-number/edit/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );



    /*사업 계획 콤보 조회*/
    const getBusinessPlanMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/business-plan/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*버스 번호 콤보 조회*/
    const getBusNumberMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-number/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*버스 번호 운행중, 운수사 콤보 조회*/
    const getBusNumberRunningMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-number/running/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*정류장 명 콤보 조회*/
    const getBusStopNameMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-stop-name/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );
    /*운전자ID 콤보 조회*/
    const getDriverIdMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/driver-id/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*재직중,운수사 기사(운전자) 콤보 조회*/
    const getDriverEmplyedIdMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/driver-id/employed/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*민원 구분 콤보 조회*/
    const getCivilComplaintDivisionMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/civil-complaint-division/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*노선번호 콤보 조회(backup)*/
    const getRouteNumberBackupMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/route-number/backup/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*정류장 명 콤보 조회(backup)*/
    const getBusStopNameBackupMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-stop-name/backup/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*정류장 명 콤보 조회(route-point/backup)*/
    const getBusStopNameRoutePointBackupMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-stop-name/route-point/backup/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*정류장 명 콤보 조회(route-point/backup)*/
    const getBusNumberDrivingHistoryMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-number/driving-history/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /* 노선 번호 및 이름 콤보 조회(edit) :: 사업계획관리 edit 시 사용 */
    const getRouteNumberNameMutation   = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/route-number-name/edit/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );
    /*정류장 명 콤보 조회(운행이력)*/
    const getBusStopNameDrivingHistoryMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/bus-stop-name/driving-history/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /* 노선 번호 및 이름 콤보 조회(운행이력)*/
    const getRouteNumberNameDrivingHistoryMutation   = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/route-number-name/driving-history/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*사용자콤보*/
    const getComboUserMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/user-id/search");
        },
        {
            onSuccess: (res, data) => {
                //do...
            }
        }
    );

    /*메뉴명 콤보*/
    const getMenuNameMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/menu-name/search");
        },
        {
            onSuccess: (res, data) => {
                //do...
            }
        }
    );
    /*노선 백업 버전 정보 콤보*/
    const getBackupVersionMutation = useMutation(
        async () => {
            // {temporaryYn:"N"} : 임시 저장여부가 N인 데이터만 조회
            return await api.rmPost({temporaryYn:"N"}, "/v1/versions/backup/combo/list");
        },
        {
            onSuccess: (res, data) => {
                //do...
            }
        }
    );
    return {
        getComboUserMutation,
        getCompanyIdMutation,
        getObuIdMutation,
        getAllocationOfCarsCourseNumberMutation,
        getRouteNumberMutation,
        getBusinessPlanMutation,
        getBusNumberMutation,
        getBusStopNameMutation,
        getDriverIdMutation,
        getCivilComplaintDivisionMutation,
        getRouteNumberBackupMutation,
        getBusStopNameBackupMutation,
        getBusNumberDrivingHistoryMutation,
        getBusStopNameRoutePointBackupMutation,
        getRouteNumberNameMutation,
        getOpenCompanyIdMutation,
        getDriverEmplyedIdMutation,
        getBusNumberRunningMutation,
        getBusStopNameDrivingHistoryMutation,
        getRouteNumberNameDrivingHistoryMutation,
        getRouteNumberEditMutation,
        getMenuNameMutation,
        getBackupVersionMutation
    };
};

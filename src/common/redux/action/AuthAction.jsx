export const LOGIN = "@@GUNSANBMS/LOGIN";
export const LOGOUT = "@@GUNSANBMS/LOGOUT";

export const login = (user) => ({
    type : LOGIN,
    payload : user
});

export const logout = () => ({
   type : LOGOUT
});
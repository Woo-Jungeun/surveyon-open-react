import JSEncrypt from "jsencrypt";

export const encryptText = (key, pw) => {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(key);
  return encrypt.encrypt(pw) || "";
};

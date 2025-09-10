import CryptoJS from "crypto-js";

/**
 * C# (RijndaelManaged)와 동일 스펙
 * - AES-256 / CBC / PKCS7
 * - 평문 인코딩: UTF-8
 * - Key : UTF8.GetBytes(VITE_AES_KEY) (32바이트 사용)
 * - IV  : UTF8.GetBytes(VITE_AES_IV)  없으면 key 앞 16바이트 사용
 */
const KEY_STR = (import.meta.env.VITE_AES_KEY || "").trim();
const IV_STR  = (import.meta.env.VITE_AES_IV  || "").trim();

function keyWA() {
  const full = CryptoJS.enc.Utf8.parse(KEY_STR);
  return CryptoJS.lib.WordArray.create(full.words.slice(0, 32 / 4), 32); // 32B
}
function ivWA() {
  const src = IV_STR || KEY_STR.substring(0, 16); // 별도 IV 없으면 key 앞 16바이트
  const full = CryptoJS.enc.Utf8.parse(src);
  return CryptoJS.lib.WordArray.create(full.words.slice(0, 16 / 4), 16); // 16B
}

export const AES256 = {
  Crypto: {
    encryptAES256(plain) {
      const data = CryptoJS.enc.Utf8.parse(String(plain));
      return CryptoJS.AES.encrypt(data, keyWA(), {
        iv: ivWA(),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(); // base64
    },
    // 필요 시 복호화
    decryptAES256(cipherB64) {
      const decrypted = CryptoJS.AES.decrypt({ ciphertext: CryptoJS.enc.Base64.parse(cipherB64) }, keyWA(), {
        iv: ivWA(),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return CryptoJS.enc.Utf8.stringify(decrypted);
    },
  },
};

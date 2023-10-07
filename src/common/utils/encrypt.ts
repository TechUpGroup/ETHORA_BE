import { hash, compare, genSalt } from "bcrypt";
import { ResHashPasswordDto } from "../dto/common";
import { createCipheriv, createDecipheriv } from "crypto";
import config from "common/config";

/**
 * generate hash from password or string
 * @param {string} password
 * @returns {string}
 */

export const generateHash = async (password: string): Promise<ResHashPasswordDto> => {
  const salt = await genSalt(10);
  const hashPassword = await hash(password, salt);
  return {
    salt,
    hashPassword,
  };
};

/**
 * validate text with hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const validateHash = (password: string, hash: string): Promise<boolean> => {
  if (!password || !hash) {
    return Promise.resolve(false);
  }

  return compare(password, hash);
};

export const encryptAES = (buffer: string) => {
  const initVector = Buffer.from("0000000000000000");

  const algorithm = "aes-256-cbc";
  const secretKey = config.encrypt.secretKey;
  const cipher = createCipheriv(algorithm, secretKey, initVector);

  return cipher.update(buffer, "utf-8", "base64") + cipher.final("base64");
};

export const decryptAES = (encrypted: string) => {
  const initVector = Buffer.from("0000000000000000");

  const algorithm = "aes-256-cbc";
  const secretKey = config.encrypt.secretKey;
  const decipher = createDecipheriv(algorithm, secretKey, initVector);

  return decipher.update(encrypted, "base64", "utf-8") + decipher.final();
};

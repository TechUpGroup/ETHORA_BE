import BigNumber from "bignumber.js";
import ShortUniqueId from "short-unique-id";

const uid = new ShortUniqueId({ dictionary: "hex", length: 15 });

export { uid };

export const callTimeExecute = (startTime: any) => {
  const endTime = process.hrtime(startTime);
  return Math.round(endTime[0] * 1e3 + endTime[1] / 1e6);
};

export function convertToSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function removeSpace(text: string) {
  return text.replace(/  +/g, " ").trim();
}

export const convertWeiToEther = (value: string): string => {
  if (value === "0") return "0";
  return BigNumber(value).div(Math.pow(10, 18)).toFixed();
};

export const convertEtherToWei = (value: string): string => {
  return BigNumber(value).multipliedBy(Math.pow(10, 18)).toFixed();
};

export function fillNa(arr: any) {
  const prevValues = {};
  let keys;
  if (arr.length > 0) {
    keys = Object.keys(arr[0]);
    delete keys.timestamp;
    delete keys.id;
  }

  for (const el of arr) {
    for (const key of keys) {
      if (!el[key]) {
        if (prevValues[key]) {
          el[key] = prevValues[key];
        }
      } else {
        prevValues[key] = el[key];
      }
    }
  }
  return arr;
}

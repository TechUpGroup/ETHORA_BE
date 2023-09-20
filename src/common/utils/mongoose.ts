import { Types } from "mongoose";

export const formatDecimal = (ret) => {
  if (ret instanceof Types.Decimal128) {
    return ret.toString();
  }
  if (Array.isArray(ret)) {
    ret.forEach((_, i) => (ret[i] = formatDecimal(ret[i])));
    return ret;
  }
  if (typeof ret === "object") {
    try {
      for (const key of Object.keys(ret)) {
        ret[key] = formatDecimal(ret[key]);
      }
    } catch {}
    return ret;
  }
  return ret;
};

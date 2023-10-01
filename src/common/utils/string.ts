import fs from "fs";
import path from "path";

export function readFile(filePath: string, dir?: string) {
  return fs.readFileSync(path.resolve(dir || __dirname, filePath), "utf-8");
}

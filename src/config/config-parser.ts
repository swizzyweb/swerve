import { readFile } from "fs/promises";
import { IConfig } from "./config.js";
import path from "path";

export interface IAsyncConfigParser<CONFIG> {
  parse(path: string): Promise<CONFIG>;
}

export interface ISwerveConfigException {
  message: string;
  stack: any;
}

export class SwerveConfigException implements ISwerveConfigException {
  message: string;
  stack: any;
  constructor(message: string) {
    this.message = message;
    this.stack = new Error(message).stack;
  }
}

export class SwerveConfigParser implements IAsyncConfigParser<IConfig> {
  async parse(configPath: string): Promise<IConfig> {
    let actualPath;
    if (configPath.startsWith(".")) {
      actualPath = path.join(configPath);
    } else {
      actualPath = configPath;
    }
    const content = await readFile(actualPath, {
      encoding: "utf-8",
    });

    try {
      const config = JSON.parse(content);
      this.validateConfig(config);
      return config;
    } catch (e: any) {
      throw {
        message: `Error parsing config, ${e.message}`,
        stack: e.stack ?? new Error("Error parsing config").stack,
      };
    }
  }

  validateConfig(config: any) {
    if (typeof config.port !== "number") {
      throw new SwerveConfigException("Invalid port");
    }

    if (typeof config.services !== "object") {
      throw new SwerveConfigException("Invalid services configuration");
    }
  }
}

export type KeyValue<VALUE> = { [k: string]: VALUE };

export interface IService {
  packageName?: string;
  servicePath?: string;
  packageJson?: any;

  [key: string]: any;
}

export interface IConfig {
  port?: number;
  services: KeyValue<IService>;
  [key: string]: any;
}

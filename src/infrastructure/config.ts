export interface RuntimeConfig {
 readonly environment:"test"|"development"|"production";
 readonly database:{readonly postgresUrl?:string;readonly sqlitePath?:string;};
}
export function loadRuntimeConfig(env:Record<string,string|undefined>):RuntimeConfig{
 const environment=env.NODE_ENV==="production"?"production":env.NODE_ENV==="test"?"test":"development";
 return {environment,database:{
  ...(env.DATABASE_URL===undefined?{}:{postgresUrl:env.DATABASE_URL}),
  ...(env.SQLITE_PATH===undefined?{}:{sqlitePath:env.SQLITE_PATH})
 }};
}

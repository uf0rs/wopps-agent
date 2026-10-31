import packageJson from "../package.json" with { type: "json" };

export const version = typeof __UF0RS_VERSION__ === "undefined" ? packageJson.version : __UF0RS_VERSION__;

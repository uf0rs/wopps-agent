import { createRequire } from "node:module"

export default process.env.UF0RS_PHOTON_WASM_PATH ??
  createRequire(import.meta.url).resolve("@silvia-odwyer/photon-node/photon_rs_bg.wasm")

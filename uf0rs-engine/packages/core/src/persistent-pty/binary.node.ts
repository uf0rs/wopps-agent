export const available = true

export async function resolveBinary() {
  return process.env.UF0RS_PTY_BIN || "uf0rs-pty"
}

import type { ElectronNative } from "../preload/types"

declare global {
  interface ImportMetaEnv {
    readonly UF0RS_TEST_ONBOARDING: boolean
  }

  interface Window {
    electron: ElectronNative
    __UF0RS__?: {
      deepLinks?: string[]
    }
  }
}

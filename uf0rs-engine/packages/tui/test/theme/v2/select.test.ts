import { expect, test } from "bun:test"
import { selectTheme, selectThemeMode, supportsThemeMode, themeModes } from "@uf0rs/theme/tui"
import { getWOPPSTheme } from "../../../src/theme"

test("selects complete light and dark themes independently", () => {
  const light = selectTheme(getWOPPSTheme(), "light")
  const dark = selectTheme(getWOPPSTheme(), "dark")
  expect(selectTheme(getWOPPSTheme())).toEqual(light)
  expect(light.hue).toEqual(getWOPPSTheme().light.hue)
  expect(dark.text).toEqual(getWOPPSTheme().base.text)
  expect(dark.hue).toEqual(getWOPPSTheme().dark.hue)
  expect(selectThemeMode(getWOPPSTheme(), "dark")).toEqual({ theme: dark, mode: "dark" })
})

test("selects the available mode when the requested mode is missing", () => {
  const lightOnly = { base: getWOPPSTheme().base, light: getWOPPSTheme().light } as const
  const darkOnly = { base: getWOPPSTheme().base, dark: getWOPPSTheme().dark } as const

  expect(themeModes(lightOnly)).toEqual(["light"])
  expect(themeModes(darkOnly)).toEqual(["dark"])
  expect(supportsThemeMode(lightOnly, "light")).toBeTrue()
  expect(supportsThemeMode(lightOnly, "dark")).toBeFalse()
  expect(selectThemeMode(lightOnly, "dark")).toEqual({ theme: selectTheme(getWOPPSTheme(), "light"), mode: "light" })
  expect(selectThemeMode(darkOnly, "light")).toEqual({ theme: selectTheme(getWOPPSTheme(), "dark"), mode: "dark" })
})

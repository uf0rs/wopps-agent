import { expect, test } from "bun:test"
import { Env } from "../src/env"

test("session environment omits server credentials", () => {
  const previousPassword = process.env.UF0RS_PASSWORD
  const previousLegacyPassword = process.env.UF0RS_SERVER_PASSWORD
  const previousValue = process.env.UF0RS_SESSION_ENV_TEST
  process.env.UF0RS_PASSWORD = "password"
  process.env.UF0RS_SERVER_PASSWORD = "legacy"
  process.env.UF0RS_SESSION_ENV_TEST = "included"

  const environment = Env.session()

  if (previousPassword === undefined) delete process.env.UF0RS_PASSWORD
  else process.env.UF0RS_PASSWORD = previousPassword
  if (previousLegacyPassword === undefined) delete process.env.UF0RS_SERVER_PASSWORD
  else process.env.UF0RS_SERVER_PASSWORD = previousLegacyPassword
  if (previousValue === undefined) delete process.env.UF0RS_SESSION_ENV_TEST
  else process.env.UF0RS_SESSION_ENV_TEST = previousValue

  expect(environment.UF0RS_PASSWORD).toBeUndefined()
  expect(environment.UF0RS_SERVER_PASSWORD).toBeUndefined()
  expect(environment.UF0RS_SESSION_ENV_TEST).toBe("included")
})

export * as ConfigManaged from "./managed.js"

import { Config } from "@uf0rs/schema/config"

/** A document from managed configuration: the system config directory or MDM managed preferences. */
export class Document extends Config.Document.extend<Document>("Config.ManagedDocument")({}) {}

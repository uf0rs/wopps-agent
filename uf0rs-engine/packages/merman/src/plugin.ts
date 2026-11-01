import { Plugin } from "@uf0rs/plugin/tui"
import { createMermaidCodeBlockRenderer } from "./markdown.js"
import { resolveWOPPSDiagramPalette } from "./palette.js"

export default Plugin.define({
  id: "uf0rs.merman",
  setup(context) {
    context.markdown.registerCodeBlockRenderer(
      "mermaid",
      createMermaidCodeBlockRenderer(context.renderer, () => ({
        colors: resolveWOPPSDiagramPalette(context.theme, context.themeMode),
      })),
    )
  },
})

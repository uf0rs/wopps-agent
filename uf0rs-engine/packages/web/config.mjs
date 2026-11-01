const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://wopps.ai" : `https://${stage}.wopps.ai`,
  console: stage === "production" ? "https://wopps.ai/auth" : `https://${stage}.wopps.ai/auth`,
  email: "help@anoma.ly",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/uf0rs/wopps-ai",
  discord: "https://wopps.ai/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/v2/docs" },
  ],
}

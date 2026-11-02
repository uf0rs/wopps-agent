/**
 * Application-wide constants and configuration
 */
export const config = {
  consoleMarketingEnabled: import.meta.env.VITE_CONSOLE_MARKETING_ENABLED === "true",

  // Base URL
  baseUrl: "https://wopps.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/uf0rs/wopps-agent",
    starsFormatted: {
      compact: "220K",
      full: "220,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/uf0rs",
    discord: "https://discord.gg/uf0rs",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "950",
    commits: "20,000",
    monthlyUsers: "16M",
  },
} as const

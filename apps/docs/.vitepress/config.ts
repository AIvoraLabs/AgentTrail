import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'AgentTrail — Compliance receipts for AI agents',
  description:
    'Tamper-proof audit trails for every AI agent interaction. SHA-256 hash chaining + Ed25519 signatures. EU AI Act Article 12 ready.',

  cleanUrls: true,

  appearance: 'dark',

  themeConfig: {
    sidebar: false,
    footer: false,
  },

  head: [
    ['meta', { name: 'description', content: 'Tamper-proof audit trails for AI agents. EU AI Act Article 12 compliance.' }],
    ['meta', { property: 'og:title', content: 'AgentTrail — Compliance receipts for AI agents' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Tamper-proof audit trails for every AI agent interaction. SHA-256 hash chaining + Ed25519 signatures.',
      },
    ],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'theme-color', content: '#07090F' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=DM+Mono:wght@400;500&display=swap',
        rel: 'stylesheet',
      },
    ],
  ],
})

import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

/**
 * Encode an SVG string as a data URI that Satori's <img> can render.
 */
function svgToDataUri(svgContent: string, width: number, height: number): string {
  // Inject explicit width/height and brand color
  const adjusted = svgContent.replace(
    '<svg',
    `<svg width="${width}" height="${height}" fill="#14b8a6"`,
  );
  // Percent-encode for safe data URI embedding
  const encoded = encodeURIComponent(adjusted)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

async function generateOgImage(): Promise<void> {
  const shieldSvg = fs.readFileSync(
    path.resolve('public/favicon.svg'),
    'utf-8',
  );

  const fontBricolage800 = fs.readFileSync(
    path.resolve(
      'node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff',
    ),
  );

  const fontBricolage600 = fs.readFileSync(
    path.resolve(
      'node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff',
    ),
  );

  const fontDmMono500 = fs.readFileSync(
    path.resolve(
      'node_modules/@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff',
    ),
  );

  const shieldUri = svgToDataUri(shieldSvg, 80, 98);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          background: '#07090F',
          padding: 60,
          fontFamily: 'Bricolage Grotesque',
        },
        children: [
          // Shield icon via <img>
          {
            type: 'img',
            props: {
              src: shieldUri,
              width: 80,
              height: 98,
              style: {
                marginBottom: 24,
              },
            },
          },
          // Title
          {
            type: 'div',
            props: {
              style: {
                fontSize: 80,
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: '-0.02em',
                marginBottom: 16,
              },
              children: 'AgentTrail',
            },
          },
          // Tagline
          {
            type: 'div',
            props: {
              style: {
                fontSize: 30,
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: 48,
              },
              children:
                'EU AI Act Article 12 \u2014 Audit Trails for AI Agents',
            },
          },
          // Divider line
          {
            type: 'div',
            props: {
              style: {
                width: 480,
                height: 1,
                background: '#1e293b',
                marginBottom: 40,
              },
            },
          },
          // Tech badges row
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                gap: '24px',
                fontSize: 20,
                color: '#14b8a6',
                fontFamily: 'DM Mono',
                fontWeight: 500,
              },
              children: [
                { type: 'span', props: { children: 'SHA-256' } },
                {
                  type: 'span',
                  props: {
                    style: { color: '#334155' },
                    children: '\u00B7',
                  },
                },
                { type: 'span', props: { children: 'Ed25519' } },
                {
                  type: 'span',
                  props: {
                    style: { color: '#334155' },
                    children: '\u00B7',
                  },
                },
                { type: 'span', props: { children: 'MIT' } },
                {
                  type: 'span',
                  props: {
                    style: { color: '#334155' },
                    children: '\u00B7',
                  },
                },
                { type: 'span', props: { children: 'Open Source' } },
              ],
            },
          },
          // URL
          {
            type: 'div',
            props: {
              style: {
                fontSize: 18,
                color: '#475569',
                fontFamily: 'DM Mono',
                marginTop: 36,
              },
              children: 'agenttrail.aivoralabs.org',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Bricolage Grotesque',
          data: fontBricolage800.buffer,
          weight: 800,
          style: 'normal',
        },
        {
          name: 'Bricolage Grotesque',
          data: fontBricolage600.buffer,
          weight: 600,
          style: 'normal',
        },
        {
          name: 'DM Mono',
          data: fontDmMono500.buffer,
          weight: 500,
          style: 'normal',
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    background: '#07090F',
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync('public/og-image.png', pngBuffer);
  console.log(
    `\u2705 og-image.png generated \u2014 ${(pngBuffer.length / 1024).toFixed(1)}KB`,
  );
}

generateOgImage().catch((err: unknown) => {
  console.error('\u274C Failed to generate OG image:', err);
  process.exit(1);
});

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

  const shieldUri = svgToDataUri(shieldSvg, 160, 196);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 2400,
          height: 1256,
          background: '#07090F',
          padding: 120,
          fontFamily: 'Bricolage Grotesque',
        },
        children: [
          {
            type: 'img',
            props: {
              src: shieldUri,
              width: 160,
              height: 196,
              style: {
                marginBottom: 48,
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: 160,
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: '-0.02em',
                marginBottom: 32,
              },
              children: 'AgentTrail',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: 60,
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: 96,
              },
              children:
                'EU AI Act Article 12 \u2014 Audit Trails for AI Agents',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                width: 960,
                height: 2,
                background: '#1e293b',
                marginBottom: 80,
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                gap: '48px',
                fontSize: 40,
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
          {
            type: 'div',
            props: {
              style: {
                fontSize: 36,
                color: '#475569',
                fontFamily: 'DM Mono',
                marginTop: 72,
              },
              children: 'agenttrail.aivoralabs.org',
            },
          },
        ],
      },
    },
    {
      width: 2400,
      height: 1256,
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

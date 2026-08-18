// Renders the built staff console in a real browser and photographs the shell in
// both directions, into docs/screenshots/.
//
// This exists because the direction requirement in F-03 is a visual one. A unit
// test can prove the shell writes no `dir` attribute and that the stylesheet uses
// logical properties; it cannot prove the navigation actually ends up on the right
// in Arabic, that nothing is clipped, or that the header controls sit somewhere
// sensible. Those are things somebody has to look at, and the point of this script
// is to produce something to look at, reproducibly, from the built application
// rather than from a hand-made harness that could differ from it.
//
// The screenshots are committed. GitHub has no API for attaching an image to a pull
// request body, so a committed file linked by URL is the mechanism.
//
// Usage:  npm run capture:screenshots
// (the pre-script builds the libraries and the staff application first)

import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const BUILD = join(ROOT, 'dist', 'staff', 'browser');
const SCREENSHOTS = join(ROOT, 'docs', 'screenshots');

// Desktop-first, and the shell's one breakpoint is at 60rem (960px), so this is
// comfortably a desktop viewport - the layout these screenshots are meant to check.
const VIEWPORT = { width: 1440, height: 900 };

const CAPTURES = [
  { language: 'en', direction: 'ltr', file: 'shell-en-ltr.png' },
  { language: 'ar', direction: 'rtl', file: 'shell-ar-rtl.png' },
];

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/**
 * Serves the built application over http.
 *
 * A static server rather than `ng serve`, for two reasons: this photographs exactly
 * the bundle that `npm run build` produces, and there is no child process to keep
 * alive and then kill portably. Unknown paths fall back to index.html, because the
 * application is a single-page one.
 */
async function serve() {
  const server = createServer((request, response) => {
    const requested = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    const candidate = join(BUILD, requested);
    const file = candidate.startsWith(BUILD) && extname(candidate) ? candidate : null;

    send(response, file ?? join(BUILD, 'index.html'));
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));

  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

function send(response, file) {
  const stream = createReadStream(file);

  stream.on('error', () => {
    response.writeHead(404).end('Not found');
  });
  stream.once('open', () => {
    response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'text/plain' });
    stream.pipe(response);
  });
}

/** Fails with an explanation rather than a stack trace from somewhere further in. */
async function requireBuild() {
  try {
    await stat(join(BUILD, 'index.html'));
  } catch {
    throw new Error(
      `No built staff application at ${BUILD}.\n` +
        'Run `npm run capture:screenshots`, which builds it first, rather than this script directly.',
    );
  }
}

async function capture() {
  await requireBuild();
  await mkdir(SCREENSHOTS, { recursive: true });

  const { server, origin } = await serve();
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: VIEWPORT });

    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForSelector('lib-shell');

    for (const { language, direction, file } of CAPTURES) {
      // Driven through the shell's own language switch, not by planting a value in
      // storage: this way the screenshot is evidence that the control is wired to
      // the language service, and not only that a stylesheet reacts to an attribute.
      await page.selectOption('#language-switch-select', language);
      await page.waitForFunction(
        ([lang, dir]) => {
          const root = document.documentElement;
          return root.getAttribute('lang') === lang && root.getAttribute('dir') === dir;
        },
        [language, direction],
      );

      // Nothing in this product animates on a language change, but a screenshot
      // taken mid-reflow is a screenshot somebody will argue about.
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(SCREENSHOTS, file), fullPage: true });

      // Reported so the caller can see the geometry that the picture is evidence
      // of, and so a broken layout is loud even before anyone opens the file.

      // WHAT MIRRORS IS NO LONGER A COLUMN. The navigation used to be a rail beside
      // the content and "which side is it on" was the whole check; it is a full-width
      // band of tabs now, so what has to flip is where the FIRST TAB sits within it,
      // and where the content's own gutter starts. Both are measured as an inset from
      // the inline start - the left edge in English, the right edge in Arabic - which
      // is the one measurement that means the same thing in both directions.
      const geometry = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const rtl = document.documentElement.getAttribute('dir') === 'rtl';

        const startInset = (selector) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();

          if (!rect) {
            return undefined;
          }

          return Math.round(rtl ? viewport - (rect.x + rect.width) : rect.x);
        };

        return {
          viewport,
          band: Math.round(
            document.querySelector('.shell-nav')?.getBoundingClientRect().width ?? 0,
          ),
          firstTab: startInset('.shell-nav__link'),
          content: startInset('.staff-content'),
        };
      });

      console.log(
        `${file}: lang=${language} dir=${direction} band w=${geometry.band}, ` +
          `first tab ${geometry.firstTab}px from the inline start, ` +
          `content ${geometry.content}px from it, viewport w=${geometry.viewport}`,
      );

      // The band spans the window, so a frame that had stopped mirroring would still
      // look plausible in these numbers unless they are read as insets. A tab or a
      // gutter more than a quarter of the way across the window is not a gutter.
      const limit = geometry.viewport / 4;

      for (const [name, inset] of Object.entries({
        'the first tab': geometry.firstTab,
        'the content gutter': geometry.content,
      })) {
        if (inset === undefined || inset > limit) {
          throw new Error(
            `In ${direction}, ${name} starts ${inset}px from the inline start, which is not ` +
              'a gutter. The frame is no longer mirroring; do not trust the screenshots.',
          );
        }
      }
    }

    console.log(`\nWrote ${CAPTURES.length} screenshots to ${SCREENSHOTS}. Now look at them.`);
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

capture().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});

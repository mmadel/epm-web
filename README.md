# EpmWeb

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Environment configuration

The API base URL is supplied at build time. Set `EPM_API_BASE_URL` before building,
starting or testing — either export it in the environment, or copy `.env.example` to
`.env` at the workspace root:

```bash
cp .env.example .env
```

Two values are legal:

- **`/`** — locally. It means "the origin this app is served from" and is written
  through as the empty string. `ng serve` proxies `/api` to the backend, so requests
  are same-origin. This is what `.env.example` contains; see
  [Running against a local backend](#running-against-a-local-backend).
- **An absolute `http:`/`https:` URL** — for anything deployed. There is no proxy in
  a built bundle, and a deployed app is generally not served from the API's origin:
  the patient app ships as a Capacitor bundle on a `capacitor://` origin, where a
  same-origin request resolves to the bundle and reaches no backend at all.

Anything else is rejected, **including the empty value** — an unset variable and a
blanked line both look like that, and neither is a decision. `/` is the one relative
value accepted, and the asymmetry is the safeguard.

**How a deployed environment reaches the API is not settled here.** Same origin works
locally because the dev server proxies; there is no proxy in a built bundle. Whether a
deployed app ends up same-origin behind one reverse proxy, or cross-origin with CORS
on the backend, is a topology decision, and until it is made the deployed value is an
absolute URL.

`npm run build`, the `npm start` scripts and `npm test` all run
`scripts/generate-environment.mjs` first. That script writes `projects/<app>/src/environments/environment.generated.ts`
for each application (git-ignored, never edited by hand) and exits with a non-zero
status before Angular starts if `EPM_API_BASE_URL` is missing or invalid.

Applications do not read the environment file directly; only each app's
`app.config.ts` does, passing the value to `provideApiBaseUrl()` from the `core`
library. Components and services inject the `API_BASE_URL` token instead. The token has
no default, so a missing provider is a hard injection failure.

The generated client's own `BASE_PATH` is provided in the same place, once, derived
from `API_BASE_URL` rather than handed the build value a second time — one value,
checked once. It is wired even in the apps that call nothing yet, because the
generated `BaseService` falls back to `http://localhost` when `BASE_PATH` is absent:
the first request would not fail, it would quietly go to whatever is on port 80 of the
machine the browser is on.

CI must define `EPM_API_BASE_URL` for build and test jobs.

## The API client, and bumping the API version

Nothing in this workspace hand-writes a request or a response type. The `api-client`
library is generated from the API's own OpenAPI specification, which arrives as a
**pinned npm package** — `@mmadel/openapi-spec`, published from the backend repository
and named at one exact version in `package.json`. The generated client is committed;
`npm run generate:api` regenerates it and CI insists the result is byte-for-byte what
was committed.

Bumping the API version is three commands:

```bash
npm i -E @mmadel/openapi-spec@<new version>   # -E: exact, never a range
npm run generate:api
npm run build
```

Anything the API changed underneath a screen shows up at step 3, as compile errors
naming the fields that moved. That is the entire reason the specification is a version
rather than something fetched: the bump is a commit somebody reviews, and its blast
radius is a diff.

`docs/api-client.md` has the longer version: what to commit alongside the bump, how to
read the regeneration diff, and what each failure mode means.

### The registry token

The specification is published to **GitHub Packages**, which authenticates every read,
so `npm ci` needs a token here. It is a classic personal access token with
`read:packages`, and it goes in the environment:

```bash
export NODE_AUTH_TOKEN=<token>            # bash
$env:NODE_AUTH_TOKEN = "<token>"          # PowerShell
```

Export it — that is the one mechanism, on a laptop and in CI alike. The committed
`.npmrc` redirects only the `@mmadel` scope to `https://npm.pkg.github.com` and reads the
token from `NODE_AUTH_TOKEN`; no token is written to a file in this repository, and
`npm run lint` fails if one ever is.

Without the variable set, the registry answers **401** and npm reports a published package
as unreadable. A `preinstall` guard turns that into a message naming the variable —
though only when npm does not need the network first, since `npm ci` downloads before it
runs `preinstall`. On a cold cache the 401 is what you get; `docs/api-client.md` says what
it means. CI runs the same guard as a step **before** `npm ci`, which is early enough.

In CI the value is the `PACKAGES_READ_TOKEN` secret; the automatic `GITHUB_TOKEN` cannot
stand in for it, because it reads only this repository's packages and the specification is
published from another.

## Language and direction

Arabic and English are both first-class, and the language is switched at runtime in a
single build. Angular's built-in `$localize` is compile-time and needs one build per
locale, so it cannot express that; there is no i18n library either. The mechanism is
small and lives in two places:

- `core` owns the active language. `LanguageService` holds it as a signal, exposed
  read-only, and `setLanguage()` is the only way to change it. Nothing else in the
  workspace reads or writes the language. Changing it sets `lang` **and** `dir` on the
  document element together, from one function called by one effect, and persists the
  choice in `localStorage`. Storage that is missing or throws (private browsing, and
  the patient app's `capacitor://` origin) falls back to English rather than breaking
  bootstrap, as does any stored value that is not exactly `en` or `ar`.
- `ui` owns the strings. See
  `projects/ui/src/lib/i18n/translations/README.md` for the folder and key
  conventions - **and for the fact that the Arabic files currently contain English
  placeholders on purpose**, pending sign-off from a clinician who has not yet been
  identified. Templates resolve keys with the `translate` pipe, which is impure so
  that it re-renders when the language changes.

An application opts in with `provideLanguage()` from `core` (see the staff console's
`app.config.ts`); without it the document is not labelled until something injects the
service. Stylesheets must use logical properties (`margin-inline-start`, not
`margin-left`) - Stylelint enforces this - so one stylesheet serves both directions.

Numerals are Western (1, 2, 3) in both languages, by product decision. There is no
numeral conversion anywhere and none should be added. The reasoning is recorded in
`docs/design-tokens.md`.

## Design tokens and the application shell

Every colour, space and type value comes from a token. The tokens are CSS custom
properties in one file - `projects/ui/styles/_tokens.scss` - and that file is the only
place in the workspace allowed to hold a raw colour or a `px` spacing value; Stylelint
rejects both everywhere else and its message names the token to use instead. See
`docs/design-tokens.md` for the scales, the Arabic font stack and the reasoning.

The tokens say what the values are. What one screen does with them is a separate
question, and the platform console's onboarding screen - the densest thing built out of
them so far - has its own record in `docs/PLATFORM/onboarding-screen.md`: the button and
icon vocabularies, the three list shapes, why forms open in a native `<dialog>`, and what
was tried there and taken out again.

An application picks the tokens up with one line in its `styles.scss`:

```scss
@use 'ui/styles';
```

That resolves through `dist`, which each application's build adds to the Sass load
path, to the `styles/` folder `ng build ui` copies into `dist/ui`. It is the same
specifier and the same build order as `import { … } from 'ui'`, so `npm run build:libs`
comes first for stylesheets exactly as it does for types.

The application frame - header, navigation, content area - is the `Shell` component in
`ui`, mounted by the staff console in `app.html`. It knows nothing about any one
application: navigation entries are an input of translation keys and links, and the
content is projected with `<ng-content>`. **Its navigation is on the start side, not
the left side**: the frame is a CSS grid whose template puts `nav` before `main` on the
inline axis, so Arabic mirrors it with no direction-specific CSS. The header's language
switch writes through `LanguageService` and never touches `dir` or `lang` itself.

### Checking direction by eye

A unit test can prove the shell writes no `dir` attribute and that its stylesheet is
free of physical properties. It cannot prove the navigation actually lands on the right
in Arabic, that nothing is clipped, or that the header controls sit somewhere sensible.
Those need looking at:

```bash
npm run capture:screenshots
```

That builds the libraries and the staff console, serves the built bundle, drives the
shell's own language switch in a real browser, and writes `docs/screenshots/shell-en-ltr.png`
and `docs/screenshots/shell-ar-rtl.png`. It prints the measured position and width of
the navigation and content in each direction, and fails outright if the navigation is
not on the side the direction calls for - so a broken frame is loud before anyone opens
the files. **The images are still there to be looked at**; the assertion only catches
the one failure it knows the name of.

The screenshots are committed because GitHub has no API for attaching an image to a
pull request body, so a committed file linked by URL is the only way to put one there.

## Development server

This is a multi-application workspace, so a bare `ng serve` cannot pick a project.
Serve an application by name:

```bash
npm start            # the staff console, same as npm run start:staff
npm run start:staff
npm run start:patient
```

Each of these regenerates the environment file and builds the libraries first, so a
missing or invalid `EPM_API_BASE_URL` stops the server before it starts, and the
applications can resolve `core`, `ui` and `api-client` through `dist/`.

Note that the dev server answers with HTTP 200 even when the bundle fails to
compile, so a request succeeding is not on its own evidence that the application
built. Check the terminal for `Application bundle generation complete`.

While editing a library, rebuild it on change in a second terminal so the running
application picks the change up:

```bash
npx ng build core --watch
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Running against a local backend

Two commands, in two terminals: start the backend, then start an app.

```bash
.\mvnw.cmd spring-boot:run    # in the backend repository
npm start                     # here
```

That is the whole setup. `proxy.conf.json` at the workspace root forwards `/api` to
`http://localhost:8080`, and every application's `serve` target proxies through it, so
the browser sees `localhost:4200/api/…` — a same-origin request. Nothing has to be
configured on the backend, and nothing needs to be allowed for `localhost:4200`.

The absence of a preflight is the point rather than a detail: the onboarding request
carries an `Idempotency-Key` header, which a cross-origin request would have to
negotiate first, and a failed negotiation surfaces in the browser as a network error
that reads exactly like the API being down.

If the backend is not running, the request fails immediately and the terminal says so
by name:

```
[proxy] GET /api/v1/platform/plans -> http://localhost:8080 failed: ECONNREFUSED
[proxy] Nothing is listening on http://localhost:8080. The app is fine; the backend is not running.
```

That is the difference between "the backend is not up" and "the app is broken", so
read it before debugging anything else. If your backend listens somewhere other than
`8080`, change the target in `proxy.conf.json` — it is the only place the port appears.

**Two files, and only one of them is configuration.** `proxy.conf.json` holds the
rules; `proxy.conf.mjs` is what `angular.json` references, and all it does is
re-export those rules with the error handler that prints the lines above. It exists
because this workspace serves with Vite, whose proxy reports a refused connection as a
bare `ECONNREFUSED` without saying where it was connecting to — and a failure that
names nothing is the one people spend an afternoon on. Add rules to the JSON; the
wrapper picks them up. `npm run lint` fails if an application serves without it.

The proxy is a `ng serve` feature and exists in no built bundle, so it says nothing
about how a deployed application reaches the API. That is settled under
[Environment configuration](#environment-configuration), not here.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

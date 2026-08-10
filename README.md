# EpmWeb

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Environment configuration

The API base URL is supplied at build time and is never relative or same-origin: the
staff console and the patient app (which ships as a Capacitor bundle served from a
`capacitor://` origin) are deployed separately from the API.

Set `EPM_API_BASE_URL` to an absolute `http:`/`https:` URL before building, starting or
testing. Either export it in the environment, or copy `.env.example` to `.env` at the
workspace root and fill it in:

```bash
cp .env.example .env
# EPM_API_BASE_URL=https://api.example.com
```

`npm run build`, the `npm start` scripts and `npm test` all run
`scripts/generate-environment.mjs` first. That script writes `projects/<app>/src/environments/environment.generated.ts`
for each application (git-ignored, never edited by hand) and exits with a non-zero
status before Angular starts if `EPM_API_BASE_URL` is missing or invalid.

Applications do not read the environment file directly; only each app's
`app.config.ts` does, passing the value to `provideApiBaseUrl()` from the `core`
library. Components and services inject the `API_BASE_URL` token instead. The token has
no default, so a missing provider is a hard injection failure.

CI must define `EPM_API_BASE_URL` for build and test jobs.

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

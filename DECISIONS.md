# Decisions

Choices this repository has made that the code cannot state for itself: a dependency
taken on, a boundary drawn, a standard adopted. Each entry says what was chosen, what
was rejected, and **why the rejected option was rejected** — because the reason is the
part that stops the decision being reopened every six months by somebody who can see
only that the other option looks simpler.

A decision belongs here when reversing it would be a project rather than a commit.
Anything narrower belongs in a comment beside the code, which is where most of this
repository's reasoning lives.

---

## D-1 — `angular-auth-oidc-client` for OpenID Connect in the browser

**Decided:** T-111, release 0.3.0.
**Applies to:** the platform console and the staff console. Not the patient app,
which is a placeholder with no design behind it.

`LLD-main.md` §T6 names no OIDC library, and signing a console in needs one.

### Taken: `angular-auth-oidc-client`

- **Standalone-component native.** The workspace has no `NgModule` in it, and
  `provideAuth()` fits `app.config.ts` beside every other provider.
- **PKCE and silent renew without a wrapper.** Both are configuration rather than
  code we own: `responseType: 'code'` with PKCE on by default, and silent renew
  through a refresh token.
- **It does not depend on Keycloak.** This matters more than the other two. The
  provider is a decision this product has already reconsidered once, and a library
  that speaks OIDC rather than Keycloak means changing provider is a change to an
  issuer string.

What the workspace still owns is the part the library has no opinion about: the six
states a console can be in before it can show anything (`AuthStatus`), which requests
the token is allowed on (`isApiRequest`), and what a 401 and a 403 each mean. That
split is deliberate — see `projects/core/src/lib/auth/`.

### Rejected: `keycloak-angular` with `keycloak-js`

The obvious choice, and it binds the console to Keycloak's own client library.
`keycloak-js` split from the server at 26.2 and now follows its own release cadence,
so taking it means tracking a second version against a server this product may not
keep. The coupling is not only in the dependency: its API is shaped around Keycloak's
concepts, so the code written against it would have to be rewritten rather than
reconfigured if the provider changed.

### Rejected: hand-rolling the code exchange

PKCE, silent renew, storage and clock skew are four places to be subtly wrong, and
**being subtly wrong in auth looks like working**. A hand-rolled exchange that skips
the `state` check, or compares an `iss` claim loosely, or renews a token a second
after it expired rather than a minute before, passes every test somebody thinks to
write and fails in production against one provider on one clock.

### The rule this creates

**One auth library in this workspace, permanently.** If it fights, the answer is to
report what it is fighting about, not to add a second — two auth libraries in one
workspace is a tax on every future ticket and a second place for a token to be
stored. T-111 §10 says this outright, and it is repeated here because §10 is a
ticket and this is the standing rule.

### Consequences worth knowing

- `core` now has `@angular/router` and `angular-auth-oidc-client` as peer
  dependencies. It did not before; the guard needs the first and the OIDC
  implementation needs the second.
- The token lives in `sessionStorage`, never `localStorage`. That is the library's
  default and it is pinned explicitly in `provide-oidc-auth.ts` so that a change to
  the default is a line in a diff rather than a silent one.
- `autoUserInfo` is off. The claims for a header come from the id_token, so the
  console makes no call to the provider's userinfo endpoint — which would carry a
  bearer token to Keycloak and be indistinguishable, in a network tab, from the leak
  T-111 criterion 4 exists to rule out.

---

## D-2 — The identity provider's host is a build-time variable; the realm is not

**Decided:** T-111, release 0.3.0.

`EPM_AUTH_ISSUER_BASE_URL` is read at build time, like `EPM_API_BASE_URL`, and each
console appends its own realm — `epm-platform` or `epm-staff`. The two halves
together are the issuer.

The split is along what actually moves. The host moves between environments, and
`http://localhost:8180` is a development address, which T-111 §10 says must not be
baked into a bundle. The realm does not move: which population an account belongs to
is a fact about the console, true in every environment, and putting it in the
environment would invite a build that pointed the staff console at the platform
realm.

**Rejected: the whole issuer as one variable.** One `environment.generated.ts` is
shared by all three applications, so a single issuer variable could only ever be
right for one of them.

**Rejected: hardcoding the issuer in each `app.config.ts`.** It is the shorter
version of this and it ships `localhost:8180` in a production bundle.

Unlike `EPM_API_BASE_URL`, `/` is **not** accepted. The API can be same-origin because
`ng serve` proxies `/api` to it; the identity provider is its own server on its own
port in every environment there has been, so a relative value could only ever reach
the console itself.

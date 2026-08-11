# `openapi/openapi.json`

The API this workspace talks to, described by the API itself.

## Where it comes from

It is **not written here**. The backend generates it from its own controllers and
commits it (ticket `T-84`); this copy is vendored into `epm-web` so that:

- a clean checkout can run `npm run generate:api` with nothing else checked out, and
- CI can tell that the committed client is stale, by regenerating from a file that
  is in the same commit as the client.

Vendoring is the price of those two properties. The alternative — reading the
specification out of a sibling checkout of the backend — makes generation depend
on a directory layout CI does not have.

## Refreshing it

Copy it from the backend repository and regenerate:

```bash
cp ../epm-service/openapi/openapi.json openapi/openapi.json
npm run generate:api
```

Commit both the specification and the regenerated client, in one commit. They are
an input and its output: a commit carrying one without the other is the exact
state the CI staleness check exists to reject.

## Editing it

Don't. Every field in it is a fact about the running backend. A change made here
rather than in a controller produces a client that compiles against an API nobody
serves — which is worse than no types at all, because it fails at runtime with the
build having been green. If a shape is wrong, it is wrong in the backend.

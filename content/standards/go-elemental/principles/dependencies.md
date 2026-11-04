---
key: dependencies
name: Dependencies
type: principle
level: go-elemental
---

# Dependencies

Go Elemental's dependency line is **bottom-up, no provider in a base, kept light**.

- **Bottom-up.** A module depends only on modules below it: go-core at the bottom, the adjacent
  libraries beside it, the infrastructure libraries and application SDKs above them, and the
  templates and reference architectures on top. go-database's base module depending on sqlate
  is the line followed: the dependency points down, to a library that is itself engine-free.
- **No provider in a base.** A database driver, a vendor SDK, or an exporter enters only
  through a sub-module that pins it in its own `go.mod`: go-database's, sqlate's, and
  go-messaging's `postgres`, go-messaging's `nats`, go-storage's `azureblob` and `s3`,
  go-observability's `otlp`. Importing a base module compiles none of it.
- **Kept light.** A base module takes the standard library first, and beyond it only what its
  repository's stated line admits: packages as idiomatic and stable as the standard library
  (`golang.org/x/…`), or a library sourced under [Sourcing](#sourcing). go-observability's base
  module carries the in-process OpenTelemetry API and SDK, which is its stated line, while the
  exporters and their gRPC weight live in its `otlp` sub-module.

Two repositories enforce the line with a depguard rule in their check, so an import outside it
fails the check and CI: go-cli-sdk's rule holds the module to the standard library and go-core,
and go-messaging's holds its base module to the standard library, go-core, sqlate, and sqlate's
`query` package. Every other repository holds the line by discipline: planning states which
module a new dependency enters, and review rejects an import no stated line covers.

This line bounds dependency weight. Which packages may import a provider at all is the separate
import-boundary rule of the [service tiers](../../../principles/service-tiers.md) principle.

## The line per tier

- **Core SDK** — go-core enhances the line to the standard library alone. It is the bottom of
  the dependency graph; importing one of its packages pulls nothing beyond the standard
  library.
- **Adjacent libraries** — a base module depends on the standard library, on packages as stable
  as it, and on another adjacent library below it, never on a tier: sqlate's base takes the
  standard library alone, and blobfs's takes sqlate and `golang.org/x/text`. An engine is a
  sub-module that pins its driver.
- **Infrastructure libraries** — a base module depends on the standard library, go-core, the
  adjacent library it builds on, if any, and what its repository's stated line admits:
  go-observability's base carries the OpenTelemetry API and SDK, and `otelhttp` as a stated v0
  exception. Each provider is a module of its own whose `go.mod` pins its driver, so a consumer that
  needs only the standard tier never pulls a driver.
- **Application SDKs** — the base module depends on the standard library and go-core. An
  application SDK has no providers: its standard tier is the technology's common standard over
  the transport the platform already provides. A library it sources is pinned in a capability
  sub-module of its own, never the base module, so a consumer that does not need the capability
  compiles none of it.
- **Templates** — go-core and the template's one application SDK, at pinned releases, and
  nothing else. A template is engine-free: no data engine declared, no provider imported; a
  generated application selects providers in its own composition root.
- **Reference architectures** — the application SDK and the capability sub-modules it uses, the
  infrastructure and adjacent libraries it composes, the standard API an infrastructure library
  exposes in its contract (go-web-service takes OpenTelemetry's metric SDK beside
  go-observability), and the providers of its declared stack, each at a pinned release. Provider
  imports are confined to the packages the import boundary declares.

## Sourcing

Write a capability in-house when it is generic to its layer and has no specification or
security surface, so that its failure shows in a unit test you would think to write. Source an
industry-standard library, as a pinned `go.mod` dependency, when the capability's correctness
depends on a specification with known corner cases, a threat model, or cryptography. Never
carry a dependency for what the standard library provides. The test for "trivial" is not line
count: a request-ID middleware fails loudly, while a rate limiter fails by growing memory under
an attacker's keys with answers that look right.

An industry-standard library shows these markers, in rough order of weight:

1. It uses standard-library types at its boundary (`http.Handler`, `context.Context`, `error`),
   so it can be removed without touching callers.
2. It has few or no transitive dependencies.
3. The project that defines its ecosystem maintains or adopts it.
4. It has a stable major version.
5. It solves a specification or a threat model, not a preference. Convenience libraries for
   binding, rendering, or validation are preferences, and preferences stay in-house.

A sourced library enters as a pinned `go.mod` entry, never copied into the tree, and its weight is
isolated by module: a capability sub-module of an application SDK or a provider sub-module of an
infrastructure library, which the base module never imports, unless the repository states an
exception for its base module, as go-observability does for `otelhttp`. A repository that admits a
sourced library states its line beside its link to the standard: the category it admits and the
library taken under it. A capability that collaborates with an infrastructure service lives in that
service's library, over standard-library types, never in an application SDK.

go-web-sdk is the worked case for a capability sub-module. Its README lets a middleware
sub-module admit a sourced dependency in one category, a specification surface or a threat
model, under the organization's markers, and keeps cryptography out of the SDK.
`middleware/rate-limit` takes `github.com/go-chi/httprate` under the threat-model category,
pinned in its own `go.mod`; the base module requires go-core alone. go-observability is the
worked case for a stated exception: its README admits `otelhttp`, from a contrib repository that
has never released its instrumentation modules past v0, as a stated v0 exception that passes
every other marker. go-storage's README admits `s3`'s `feature/s3/transfermanager` as a stated v0
exception in a provider sub-module, sourced under the specification category: S3's multipart
upload protocol.

## Peers compose in the application

Application SDKs and infrastructure libraries are peers on the core SDK. An application SDK
never imports an infrastructure library, neither its base module nor a provider, and an
infrastructure library never imports an application SDK's vocabulary into its contract. Their
composition happens in the application: the SDK exposes an extension point, and the
application declares the policy at its composition root. The web SDK's error writing is the
worked case: the SDK defines the error-returning handler and the writer, and the application
supplies the matchers that map the database library's error types to HTTP statuses, so a new
infrastructure library costs the SDK nothing and its errors are one more matcher.

HTTP middleware composes the same way. A library with no HTTP concern supplies a collaborator,
such as a logger, and the transport's middleware uses it. A library whose concern is
HTTP-shaped, such as tracing or token verification, exposes its middleware as a
`func(http.Handler) http.Handler` built from `net/http` types alone. That type is structurally
the web SDK's `web.Middleware`, so the middleware composes into any service built on the SDK
while the library never imports the SDK. go-observability's `NewMiddleware` is the worked case.
The arrangement works because every layer builds on the standards and the standard library,
which every layer above depends on too. A lower layer plugs into a higher one through those
shared types without depending on it.

## A provider is selected by construction

A consumer selects a provider in its composition root by importing it and calling its typed
constructor. The organization's libraries keep no runtime registry and no registration call,
and importing one of their packages registers nothing of theirs. Adding a provider is one new
import at the composition root and no change to the base module.

## Integration is structural where it can be

A library integrates with go-core by implementing its contracts rather than by importing more of it
than it uses. The configuration contract is imported where a module's configuration block joins the
layered load. Lifecycle integration is structural: a module's start, shutdown, and readiness methods
match the coordinator's hook signatures, and the composition root registers them, so the module
itself needs no lifecycle import to integrate; go-web-sdk imports it only because its readiness
probe reports the coordinator's checks. Integration is also optional per layer: a composition-root
layer with nothing that starts, stops, or reports readiness, the Elemental Architecture's Domain
Service composition among them, registers nothing and needs no lifecycle import either.

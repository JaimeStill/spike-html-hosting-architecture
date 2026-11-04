---
key: tests-and-docs
name: Tests and documentation
type: principle
level: go-elemental
---

# Tests and documentation

Testing runs in two tiers. The unit tier is what each repository's check runs: hermetic,
black-box, on every pull request. The integration and acceptance suites run a real process or
a real engine, each behind its own task or CI job. A test proves a behavior only if it can
fail; marathon's standards-reviewer names the ways a green test lies,
[tautological, structure-sensitive, or unable to fail](https://github.com/standards-lab/claude-plugins/blob/main/plugins/marathon/agents/standards-reviewer.md),
and rewrites or deletes such a test.

## The unit tier: black-box and hermetic

Every test lives in an external test package (`package <pkg>_test`), co-located with the
source it covers, and drives only the package's exported API; unexported code is covered
through the exported entry points that use it. The one white-box file allowed is
`export_test.go`, and it exists only to export a hook for what the API cannot reach: a clock or a
probe it cannot reach deterministically, or a fixture node added before `Run`, such as
go-web-sdk-template's
[`AppendReactor`](https://github.com/standards-lab/go-web-sdk-template/blob/main/template/internal/app/export_test.go).
The tests that use the hook stay in the external package.
Check enforces the rule: every repository's golangci-lint configuration enables the
`testpackage` linter with its skip regexp narrowed to `export_test\.go`.

The tier is hermetic: `go test -race ./...` passes with no service running. A package proves
its behavior with fakes, scripted drivers, and loopback listeners:

- **SQL libraries** run over sqlate's `sqltest`, a scripted `database/sql` driver that
  supports prepare and fails where a real driver would, so prepare-based verification is
  provable on this tier.
- **Providers** may drive a loopback test server on port 0. go-database's postgres provider
  tests drive a startup exchange with an in-test `pgproto3` server, asserting the user,
  database, and password the provider sends over TCP, and the database over a Unix socket.
- **Handlers** run through recorded requests with no listener; a test that must listen binds
  port 0 and reads the assigned port back, never a fixed port.

A shared test helper stays in its test package until more than one test package needs it; then
it is hoisted into a `<pkg>test` package, following the standard library's `httptest` and `fstest`
naming, under `internal/` unless another module's tests consume it.

A composition root's test fixtures live in an internal `<app>test` package even when only one test
package consumes them. The fixtures are built over the composition the root publishes, its graph
and its nodes: a fixture replaces a node's constructor with a substitute or observes which nodes a
build reaches, and wraps no production constructor. The composition root's tests then need no
`export_test.go` beyond the clock, probe, or fixture-node hook above.
go-cli-sdk-template's
[`template/internal/apptest`](https://github.com/standards-lab/go-cli-sdk-template/blob/main/template/internal/apptest)
holds its `internal/app` fixtures this way, and so does go-web-service's
[`internal/apptest`](https://github.com/standards-lab/go-web-service/blob/main/internal/apptest),
whose fixture replaces the meter provider node's constructor with one over a manual reader, so
the unit tier proves the outcomes the sweep metrics hook records.

## Integration and acceptance suites, and where each runs

Each suite that needs a real process or engine sits behind a build tag or an environment
variable, so the unit tier never reaches it:

- **sqlate's and blobfs's postgres suites** (`-tags integration`, in the `postgres`
  sub-module) prove the engine claims against PostgreSQL. `mise run integration` runs them
  against the database the repository's DSN variable names, and `mise run acceptance` brings
  up the compose stack, runs them (and, in blobfs, the composition example), and resets the
  stack whatever the result. They run on a developer's machine; no CI job runs them, and the
  check neither compiles nor runs them.
- **go-storage's acceptance tests** run the storage conformance suite against a real service,
  `azureblob`'s when `AZUREBLOB_TEST_ENDPOINT` names one and `s3`'s when `S3_TEST_ENDPOINT` does,
  and skip otherwise. `mise run acceptance:azureblob` and `mise run acceptance:s3` each start
  their provider's service from the compose harness (Azurite or SeaweedFS), run that module's
  tests against it, and stop it whatever the result; `mise run acceptance` runs both. CI's
  `acceptance` job runs `mise run acceptance` on every pull request into `main` and every push
  to it.
- **go-messaging's suites** (`-tags integration`) prove its engine and its broker: the
  `postgres` sub-module's against PostgreSQL, run by `mise run integration:postgres`, and the
  `nats` sub-module's, through its `natstest` package, against NATS with JetStream, run by
  `mise run integration:nats`. Each task starts only its own compose service, runs the suite,
  and stops the service whatever the result. `mise run integration` runs both, and so does CI's
  `integration` job, on push to `main` and on manual dispatch.
- **go-web-sdk-template's, go-cli-sdk-template's, and go-web-service's integration tier**
  (`-tags integration`, in the root-level `integration` package) runs the built program as a
  subprocess, black-box: a service through its API, and a CLI through its arguments, its two
  output streams, and its exit code. Each repository's `mise run integration` task and CI `integration` job run
  it, the job on push to `main` and on manual dispatch. go-web-service's task and job boot its
  compose stack under Docker as an isolated project on its own ports and tear it down with its
  volumes; the templates are engine-free and run the suite against the binary alone. The check
  vets, fixes, and lints the suite with the integration tag, so it always compiles, but runs
  only the unit tier.

The integration tier drives a service only through production surfaces: configuration by
environment variable, the API and the admin mount for state, the network for faults, and
signals and the exit code for lifecycle. It observes through the same surfaces, plus the log
for what only the log records and, in go-web-service, the object store read beneath the API and
the telemetry exporter, which configuration aims at an OTLP receiver the test runs (the sweep
metrics test sets `APP_OBSERVABILITY_ENDPOINT` and `OTEL_METRIC_EXPORT_INTERVAL`).
It drives a CLI through configuration by environment variable and its arguments, and observes
it through its standard output, its standard error, and its exit code.
Nothing in the runtime exists for the tests' sake.

### Integration toolkits and harness rules

A library whose infrastructure an integration suite exercises ships the toolkit beside it.
go-core's `process/processtest` runs a program as its binary and drives it through its output,
its signals, and its exit code; go-web-sdk's `webtest` is the client a suite drives a running
service through. Both suites build their harness on them, and the harnesses follow these rules:

- **A stall is a finding, never a sleep.** Every wait is a poll on an observable condition,
  bounded by `processtest.Failsafe` or a multiple of it, and a wait that runs out fails the test.
- **Readiness through the API.** A harness waits for a process to be ready by polling its
  probe, never by reading its output.
- **One connection per client.** `webtest`'s client holds one connection per host, so the
  service's graceful shutdown never waits on an idle second connection.
- **Interrupt before kill.** Stopping a process sends an interrupt and kills only a process
  that has not exited within the bound.
- **Faults at the network.** `processtest`'s forwarder relays a backing service over loopback,
  and go-web-service's outage cases and go-messaging's NATS outage case sever it, so a fault is
  indistinguishable from an outage.
- **Output captured on failure.** Every process's output is captured; `processtest` includes
  it in each failure it reports, and go-web-service's harness logs it for any failed test.
- **The harness proves itself on the unit tier.** `processtest` carries unit tests against a
  stand-in program, `webtest` against an `httptest` server, and go-web-service's state helpers are
  tested against an `httptest` server; the template's harness is untagged, so the unit tier
  type-checks it on every pull request.

Toolkit mechanics, such as dropping the race runtime's exit sleep from a launched binary, stay
with the toolkit's own code and documentation.

## doc.go and godoc

Each API package has one `doc.go` holding only the package comment, and that comment is the
authoritative description of the package's API. It inventories every exported identifier with
a one-clause role and points to the symbols for the rest; each contract is stated once, on its
symbol's own doc comment. Production symbols carry doc comments. A short method that exists only
to satisfy a standard library interface, `Error() string` on a type whose comment already says
what the error means or `String() string` on a `Stringer`, needs no comment of its own. Whether
an inventory is complete is the reviewer's judgement; no check enforces it.

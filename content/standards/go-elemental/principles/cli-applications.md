---
key: cli-applications
name: CLI applications
type: principle
level: go-elemental
---

# CLI applications

A command-line tool is the second Go Elemental application type, beside the web service. It
follows the same [import direction and composition root](topology-and-naming.md#application-layer-import-direction)
as a web service, with one difference that shapes the rest: a CLI runs one command per process,
so its graph is built per command, and a command brings up only the dependencies it declares. A
CLI builds on [go-cli-sdk](https://github.com/standards-lab/go-cli-sdk), whose
[`cli` package documentation](https://github.com/standards-lab/go-cli-sdk/blob/main/doc.go)
states the dispatcher's API, and starts from
[go-cli-sdk-template](https://github.com/standards-lab/go-cli-sdk-template), which scaffolds the
layout below.

This page states the conventions particular to a CLI, and links the rest where it is stated:
[The composition root](../../../principles/composition-root.md#the-entrypoint-owns-process-entry-and-exit)
states why a CLI's configuration is a node of its graph,
[Domain package files](domain-files.md) how a domain package
[splits its API by dependency profile](domain-files.md#a-cli-splits-its-api-by-dependency-profile)
and [lays out its commands](domain-files.md#a-cli-domains-commands), and
[Tests and documentation](tests-and-docs.md#the-unit-tier-black-box-and-hermetic) where the
composition root's fixtures live.

## The composition root's layer files

`cmd/<name>/main.go` derives go-core's signal context, passes it, `cli.Streams` over the
process's standard streams, and the arguments to the composition root, and exits with the code
the run returns. It loads nothing.

`internal/app` has one file per layer:

- `app.go` holds `App`, with `New` and `Run`, and `Nodes`. `New` describes the graph layer by
  layer and builds the command tree; it is cold, reading and building nothing. `Run` is one
  `cli.Run` with `WithGraph`. `Nodes` holds one handle per node, each named as the dispatcher
  labels its errors. The App publishes its graph, its `Nodes`, and its root command, so a
  fixture can observe or replace a node before a run.
- `infrastructure.go` defines the configuration and the infrastructure services as graph nodes.
  Configuration is read in its node's constructor, from the tool's environment prefix, only when
  a build reaches it; no aggregate `Config` struct gathers it. It is the only file in the
  composition root that names a provider. A command package outside the root may name the
  provider its commands work through: go-web-service's `slab` tool builds go-messaging's NATS
  broker in its [`events`](https://github.com/standards-lab/go-web-service/blob/main/tools/slab/events)
  package, which `infrastructure.go` defines the broker node over, and its `sqlate` scenario
  compiles statements with sqlate's PostgreSQL dialect.
- `domain.go` defines each domain's nodes and mounts that domain's commands, one
  `root.Add(pkg.Commands(...)...)` per domain over the nodes it passes.
- `version.go` holds the version command, which declares no nodes and prints the main module's
  version.
- `admin.go` defines and mounts the admin services' nodes and commands as `domain.go` does the
  domains', and exists only where the CLI has admin commands. Its packages sit under `admin/`,
  beside `domain/`.
- `scenario.go` mounts the scenarios, and exists only when the CLI opts into them
  ([Scenarios are opt-in](#scenarios-are-opt-in)).

There is no `config.go`, no `commands.go`, and no initializer: each layer file fills its own
part of the graph and mounts its own commands, so adding a command touches its layer file and
its package, and nothing else. The composition root's fixtures live in an internal `apptest`
package, as go-cli-sdk-template's `Builds` and `Halt` do.

## A command builds only what it declares

- **`Use` and `inv.Get`.** A command declares the nodes it needs with `Use` and reads their
  values in `Run` with `inv.Get`, so a run builds only those nodes, and a command that declares
  nothing builds nothing and reads no configuration. The
  [`cli` package documentation](https://github.com/standards-lab/go-cli-sdk/blob/main/doc.go)
  states how the dispatcher builds, runs, and shuts the nodes down, and that `inv.Get` panics on
  a node the command did not declare, which enforces the
  [wiring rule](lifecycle-and-context.md#the-wiring-rule).
- **`Validate` builds nothing.** A command checks its input in `Validate`, as
  [a CLI domain's commands](domain-files.md#a-cli-domains-commands) do.
- **Root flags are checked in `PreRun`.** A root flag is accepted at any depth, so a check every
  command shares, such as a flag that names something the tool cannot build, belongs in the
  root's `PreRun`. The
  [`cli` package documentation](https://github.com/standards-lab/go-cli-sdk/blob/main/doc.go)
  states where `PreRun` falls in the dispatch order.

## Exit codes and command words

- **Help and usage errors exit 2.** Requested help, a parent run with no subcommand or an
  unknown one, and every usage error return go-core's
  [`ExitUsage`](https://github.com/standards-lab/go-core/blob/main/process/doc.go); any other
  failure returns `ExitFailure`, 1, reported once on stderr. `cli.Run` returns the code and the
  entrypoint exits with it unchanged, so no tool remaps a code or prints its own error line.
- **Subcommands are bare words.** A parent names the capability, so its subcommands never repeat
  it: `<tool> files list`, not `<tool> files list-files` or `<tool> files-list`.

## Scenarios are opt-in

A scenario is a narrated, guided tour of the tool's own commands, a different kind of thing from
a command that does one operation and prints its result, and not every CLI has them. The
template ships none.

A CLI that opts in keeps its scenarios in one root-level package named `scenarios`, and runs
them on go-cli-sdk's [`scenario`](https://github.com/standards-lab/go-cli-sdk/blob/main/scenario/doc.go)
runner, never one of its own. Its `scenario.go` mounts `scenario.Commands(scenarios...)` at the
root, and the root's `Footer` calls `scenario.WriteListing` with the same scenarios.
`<tool> scenario <name>` runs one scenario, which declares its nodes like any other command and
builds only those. `<tool> scenario` alone prints its help, and that help and the root's both
end with the listing, so a CLI has no `list` command.

---
key: validation-first
name: Validation-first layering
type: principle
level: architecture
---

# Validation-first layering

Validation runs at the earliest moment within its scope, before that scope's first effect. When
every layer follows the rule, the first failure that surfaces is the outermost defect: the one
closest to the author's mistake, reported in the author's terms, before any inner layer has
acted on the malformed input.

The principle is a layering rule, not a call to validate more. Each scope validates what it
owns, once, at its boundary. A file validates when it loads. A configuration validates when it
finalizes. A statement validates when it compiles, and again when the process verifies it
against its target. A request validates when it is parsed. An inner scope trusts what an outer
scope has validated and validates only what it adds. The outermost defect surfaces first
because the outermost scope ran first.

## What early validation provides

- The failure names the cause. A malformed declaration fails as a malformed declaration at load
  time, not as a database error at the first request that used it.
- A process that cannot be correct does not start. Startup validation stops the process before
  readiness reports ready, so an orchestrator sees a failed start rather than a serving process
  with a latent defect.
- The inner layers stay simple. A layer that can trust its input carries no defensive
  re-checking of what an outer layer already proved.

## Where the organization's code applies the rule

- Configuration. A configuration type finalizes once, in a fixed order, and a malformed
  environment override fails the finalize step, so the composition root never receives a
  configuration that did not validate. The mechanism is the core SDK's `config` package, and
  its package documentation states the contract.
- Authored SQL. The parameter delimiter is reserved, so text that looks like a parameter and is
  not one fails the file's load. A statement then compiles against the pattern catalog, and at
  startup the process verifies every statement in a domain's inventory against the live schema,
  so a renamed column fails the process before it serves a request. The convention is the
  [DSL-driven services](../standards/go-elemental/principles/dsl-driven-services.md) principle's.
- Requests. The web SDK parses a read request's query string in full before any statement is
  composed, and it rejects a malformed key or an operator on a reserved name as the request's
  defect. The mechanism is the web SDK's query parse, and its package documentation states the
  grammar.

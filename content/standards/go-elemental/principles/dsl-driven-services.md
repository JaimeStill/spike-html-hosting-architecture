---
key: dsl-driven-services
name: DSL-driven services
type: principle
level: go-elemental
---

# DSL-driven services

An infrastructure service whose expressive content is a language of its own is integrated
through that language. The language's text is the primary artifact: it is written in its own
language, versioned in the repository, and reviewed as itself. The host-language library does
only what the language cannot do on its own.

## The two categories of infrastructure service

A protocol-driven service keeps its expressive content in the host language. Object storage
is protocol-driven: the consumer calls operations with typed arguments, and the provider
boundary is an interface over those operations. The
[service tiers](../../../principles/service-tiers.md) principle describes that boundary.

A DSL-driven service keeps its expressive content in a language the host cannot type-check.
SQL is one. So are the graph query languages Cypher and Gremlin, a search engine's query
language, KQL, PromQL, and the policy languages Rego and Cedar. The service's operations are
trivial, execute and query, and all the meaning is in the text. Forcing such a service into the
protocol-driven pattern produces a large host-language interface standing in for a language
that was already the right interface.

SQL is the standard's reference implementation of the category, hosted by the
[sqlate library](https://github.com/standards-lab/sqlate), whose guide documents the grammar
and the packages. Its shape is what a later search or policy integration reproduces, with no
shared code: native text, a thin library, a verification step, and a tier declaration.

## What the host-language layer does

The host-language layer exists only for what the language cannot do on its own:

1. It binds parameters safely.
2. It composes a statement against runtime input through a declared list of fields.
3. It maps results back into host types.
4. It verifies the text against its target.
5. It owns the session or transaction boundary.

Every pattern the domain layer needs is a pattern in the language with a small amount of host
code around it:

- a collection read with dynamic filters, sort, and paging
- a single record by unique constraint
- a mutation with side effects across tables in one transaction

A new pattern
is a convention with two halves. The first is a shape in the language, a file layout, a naming
rule, a header, that a reviewer or a lint can check. The second, only where needed, is a host
function that takes statements the consumer wrote. Most patterns need no function: an upsert,
a soft delete, and a batch insert are SQL shapes over the existing runners. A pattern earns a
function only when it carries a protocol the text alone cannot guarantee; the
optimistic-concurrency guard is the worked example. The library takes the consumer's text as
input and never generates it.

## What the standard supplies and what the domain owns

The library and its pattern catalog supply the shared protocols: parameter binding, paging,
ordering, the collection read, the guard. Content patterns are the domain's: a status filter,
a search predicate, a hierarchy query over a recursive table. A content pattern is authored
beside the domain's statements, never added to the library, because the library expresses no
domain vocabulary.

## Which artifact is portable

A protocol-driven service has one portability axis, the library. A DSL-driven service has two,
the library and the dialect. A runtime query builder promises to solve the dialect axis and
worsens the library axis in exchange: it is a permanent dependency with its own release cadence
and vulnerability history, which no other infrastructure service carries.

The standard makes the language the portable artifact. Authored SQL ports by editing SQL. The
library axis collapses to the standard library's `database/sql` package and one driver, the
same shape the protocol-driven services have. The dialect axis is handled by discipline: each
statement and pattern file declares its tier, standard or native, a native file names the engine
feature it uses and how another engine expresses it, and a lint enforces the declarations in CI.
The native files of a repository and its migrations, which are engine DDL by nature, are its
complete port list.

Portability by discipline is a deliberate trade, and the standard states it as one. The
alternative, portability by construction through a builder that rejects an unsupported feature
at render time, buys a type guarantee with a permanent dependency. The declared stack selects
one engine, and the portability promise exists to bound a future port, not to make today's
code engine-neutral. Discipline is the chosen side of that trade.

## Sufficiency before capability

A layer must justify itself against what the language, the standard library, and the tools
already inside the dependency line express. A fully capable layer that the language already
expresses is a defect, not a feature. The question "does the industry already solve this
inside the line?" is asked when a layer is planned, not discovered at review. The SQL support
is the standard's worked case: SQL carries the expressive content, and a statement vocabulary
in the host language, however capable, would be a second layer expressing what the first
already does.

## What the standard's authored SQL declares

The conventions below are the standard's, followed by every repository that authors SQL and
stated by none of them alone:

- Every statement and pattern file declares its tier in its header, standard or native. A
  native file names the engine feature it uses and how another engine expresses the same effect,
  so the native files are found by one search; with the migrations, which carry no tier, they
  are a repository's complete port list. The conventions linter refuses a standard file that
  uses a form the engine declares native.
- A statement is named for its operation, never for its SQL verb. The file, the store method,
  the service method, and the route share one name.
- A command's validation belongs to the domain's entity. Existence and uniqueness belong to
  the store, as the constraint violations the engine reports.
- A shared pattern is published under a namespace and included at compile time. It earns a
  host function only when it carries a protocol the SQL alone cannot guarantee; the
  optimistic-concurrency guard is the one such pattern.
- A statement is validated at three moments, each the earliest its scope allows
  ([validation-first layering](../../../principles/validation-first.md)): when the file loads,
  when the directory compiles against the pattern catalog, and at startup, when the process
  prepares every statement of a domain's inventory against the live, migrated schema.

## Injection safety is structural

The vulnerability in any integration of a text language is a path where request input becomes
language text. The library's job is to make that path not exist:

- Statement text is fixed at build time: the files are embedded in the binary.
- Request values enter only as bound arguments.
- The only text a request can influence is the choice of filter and sort fields, and those
  names pass through the list of fields the statement's header declares. An unknown name is a
  typed error, never interpolation.
- The parameter delimiter is reserved. Text that looks like a parameter and is not one fails
  the file's load, so nothing is silently interpolated.

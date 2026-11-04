---
key: tool-beside-library
name: A standalone tool beside the library
type: principle
level: architecture
---

# A standalone tool beside the library

A library that has an operator's use case ships a standalone command beside it. The command is
usable with no knowledge of the library's internals, and the library is usable without the
command. The command is the operator's interface; the library is the integrator's. Coupling
them forces one audience to carry the other's dependencies.

## How the command and the library are laid out

- The command is a thin consumer of the library's packages and never the packages' home. The
  logic the command runs lives in a package the integrator can call.
- Both ship from the same repository, and each is documented for its own audience: the
  command's usage for the operator, the package documentation for the integrator.
- The command may live in its own module when its dependencies exceed the library's, so an
  integrator who imports the library never compiles the command's dependencies.

## Where the organization applies the principle

The [sqlate library](https://github.com/standards-lab/sqlate) established the pattern. Its
conventions linter is the `sqlint` package, callable from a program, and the `sqlint` command
in the same sub-module runs that package over a module for an operator. The sub-module keeps
the linter's configuration-file dependency out of the base library.

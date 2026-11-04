---
key: standards
name: Standards
type: index
---

# Standards

A standard implements the [Elemental Architecture](../architecture.md) on a specific
technology: it declares its goals, the dependency line defining which dependencies its modules
may declare, and the principles its modules share. A module belongs to exactly one standard,
and a standard's principles enhance the architecture's without loosening them. A standard whose
posture does not satisfy the architecture's principles is not a standard of this blueprint — it
implements some other architecture.

- [Go Elemental](go-elemental/README.md) — the Go implementation of the Elemental Architecture:
  a complete reference architecture on the Go standard library.

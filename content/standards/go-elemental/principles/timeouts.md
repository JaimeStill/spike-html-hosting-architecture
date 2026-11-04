---
key: timeouts
name: Timeouts and deadlines
type: principle
level: go-elemental
---

# Timeouts and deadlines

How a Go Elemental service bounds the time a request may take when it moves a large body through
an object store. Each bound has one owner, and a slow party is charged only for its own slowness:
a slow client is never cut off by the store's bound, and a stalled store is never charged to the
client.

## Tight server timeouts, size-derived transfer deadlines

The server's read and write timeouts stay tight, sized for a request that moves no large body. A
route that moves one sets its own connection deadlines before it moves the body, through
[go-web-sdk](https://github.com/standards-lab/go-web-sdk)'s `Transfer`: the longer of the server's
read and write timeouts as grace, plus the time the body's own size takes at the configured minimum
client rate, capped at the route's limit. A small body on a route with a large limit gets a short
deadline. A `Transfer` sets only the connection's deadlines, never the request's context, so a route
that moves a body must not sit under a request timeout shorter than the transfer it allows.

## A store's per-try deadline bounds one operation

A store's per-try deadline bounds one try of an operation, never a whole transfer. A download's
body resumes past it, so a download outlasts the try however slowly the client reads.
[go-storage](https://github.com/standards-lab/go-storage)'s `ReadIdleTimeout` bounds each read of
the body instead, with the clock running only while a read is in progress: it cuts off a store
that stalls, not a client that reads slowly. The per-try deadline is sized below the idle bound, so
a stalled try resumes before the store is cut off.

## A stalled store's retry budget fits the write timeout

A store that stalls on every try is refused within the server's write timeout: its whole retry
budget, every try's deadline with the backoff between them, is shorter than the write timeout, so
the service's 503 is written before the connection's deadline passes. A configuration test in
[go-web-service](https://github.com/standards-lab/go-web-service) holds that budget against the
base configuration.

## An upload's read deadline belongs to the client

An upload's body slower than the transfer's rate fails its read deadline, and that failure is the
client's, answered 408. The store's provider reads at least the largest object the service
accepts ahead of the store, so that a stalled store never stops the body's reads: the body is read
whole or fails on its own, and a stalled store stays the store's fault. The same configuration
test holds the largest object within that read-ahead.

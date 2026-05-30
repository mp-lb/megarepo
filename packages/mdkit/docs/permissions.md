# Permissions

MDKit should make connected editing secure without owning your application's
auth system.

The application owns authentication, user identity, tenancy, document ownership,
roles, teams, audit logging, and permission policy. MDKit owns where permission
checks happen in the document, checkpoint, restore, and collaboration
lifecycle.

## Permission Contract

The proposed permission contract is one `can` function:

```ts
type MdKitPermissionAction = "read" | "write" | "restore";

type MdKitPermissions<User = unknown, Document = unknown, Context = unknown> = {
  can(
    action: MdKitPermissionAction,
    user: User,
    document: Document,
    context: Context,
  ): Promise<boolean> | boolean;
};
```

This is intentionally small. Products that do not need a separate restore
permission can implement `restore` as equivalent to `write`.

## Action Semantics

`read` allows reading the current document and checkpoint history.

`write` allows changing the current document, creating checkpoints, joining a
collaboration room, and writing/snapshotting collaboration state. Collaboration
requires `write`; MDKit does not need read-only collaboration in the initial
permission model.

`restore` allows restoring a checkpoint into the current document and resetting
collaboration state as part of that restore.

Permissions should be mandatory for the opinionated backend helper. A package
can expose an explicit allow-all implementation for local development and
applications that intentionally handle permissions outside MDKit:

```ts
export const mdKitDisablePermissions: MdKitPermissions = {
  can: () => true,
};
```

Disabling permission checks should be visible in code. It should not be the
accidental default.

## Collaboration Security

Collaboration room names are not secrets. The server must authorize every room
join.

Joining a collaboration room is both read access and write access to the live
Yjs document. Once connected, a client can receive live state and send Yjs
updates unless the server rejects or constrains that connection. Storage
callbacks alone are not enough because active Yjs state can be read or changed
before a persistence callback runs.

The join rule is:

```ts
can("write", user, document, context)
```

If permission fails, the WebSocket must be rejected before the client receives
document state or sends accepted Yjs updates.

## Enforcement Levels

Applications should be able to choose how strictly collaboration permissions are
enforced after a session joins.

### Join Only

Check `can("write")` when the user joins the collaboration room. This is simple
and common. Tradeoff: if permissions are revoked mid-session, the active socket
may keep editing until it disconnects, is closed, or is forced to reconnect.
WebSocket ping timeouts are liveness checks, not permission expiry.

### Per-Message Permission Check

Check `can("write")` in Hocuspocus `beforeHandleMessage` before every incoming
Yjs message is applied. This is closest to checking permissions before every
HTTP write request. It can read from the database directly, but it may be too
expensive for high-volume collaboration.

### Per-Message Revocation Check

Run full permission policy on join and permission-change operations, then check
a cheap revocation source per packet: an in-memory set, cache entry, permission
generation, or short-lived authorization record.

This is the practical compromise for stricter apps. The revocation source must
have the ordering guarantee the product needs. If a revocation request returns
success before every collaboration server can observe the revoked state, the
system has eventual revocation rather than strict post-response write
prevention.

## Hocuspocus Hooks

Hocuspocus exposes the server hooks MDKit needs:

- `onConnect` runs when a client first asks to connect to a document
- `onAuthenticate` runs when authentication is enabled and receives the provider
  token
- `beforeHandleMessage` runs before an incoming collaboration message is applied
  to the Yjs document

`useMdKitCollaboration` already has a token hook. That token is not the
permission policy; it is how the server identifies the user and request context
before calling `can`.

## Backend Helper Responsibilities

An opinionated MDKit backend helper should call permissions at every server-side
entry point:

| Operation | Required Action |
| --- | --- |
| Read current document | `read` |
| Write current document | `write` |
| List checkpoints | `read` |
| Read checkpoint | `read` |
| Create checkpoint | `write` |
| Restore checkpoint | `restore` |
| Join collaboration | `write` |
| Persist collaboration state from an authorized room | `write` |
| Reset collaboration state during restore | `restore` |

Frontend UI checks are convenience. Server-side checks are the security
boundary.

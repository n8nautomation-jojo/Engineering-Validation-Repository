# Authentication Runtime

**Status:** Phase 2.3 Baseline

## Online Authentication
1. User submits credentials.
2. Cloud authenticates the user.
3. Cloud validates organization/branch/device scope.
4. Cloud issues a short-lived access token and refresh token.
5. POS stores refresh material only in OS-protected secure storage where supported.
6. POS maintains a local authorization snapshot for permitted offline work.

## Offline Authentication
Offline login is not a new authentication ceremony against the cloud. It is a controlled continuation of a previously trusted device/user relationship.

Eligibility requires prior successful online authentication, registered active device, active local user record, valid offline authorization context and unexpired offline authentication policy.

Plaintext passwords are never stored.

## Authorization
Authentication establishes identity. Authorization is evaluated separately from a cached permission snapshot.

Every command contains actor and device context.

Cloud re-evaluates authorization when online.

## Revocation
Cloud-side user/device deactivation takes effect when the device receives the newer authorization/device state. Critical high-risk operations may require online validation.

## Security Rules
- Never log passwords, access tokens or refresh tokens.
- Secure refresh material using OS facilities.
- Do not allow arbitrary offline user creation.
- Do not allow offline privilege escalation.
- Preserve audit metadata for security-sensitive actions.

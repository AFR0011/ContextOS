# ContextOS Operator Accounts

ContextOS keeps public registration closed by default in production. A self-hosted deployment therefore needs an explicit trusted-shell path for creating the first real account and recovering a forgotten password without enabling public registration or running the destructive demo seed.

These commands operate directly against the PostgreSQL database selected by `DATABASE_URL`. Run them only from a trusted operator shell after applying the current migrations and verifying the target database.

## Create a real account

Create an account with a generated temporary password:

```bash
npm run account:create -- user@example.com --generate-password
```

The command prints the temporary password once. Store it securely, deliver it through an appropriate private channel, and change it after the next successful sign-in.

To supply a chosen password without putting it in the process argument list, pipe exactly one password value on stdin:

```bash
read -rsp "New ContextOS password: " CONTEXTOS_PASSWORD
printf '\n'
printf '%s' "$CONTEXTOS_PASSWORD" | npm run account:create -- user@example.com --password-stdin
unset CONTEXTOS_PASSWORD
```

The create command:

- normalizes the email to lowercase;
- requires a valid email and a password between 8 and 128 characters;
- refuses to overwrite an existing account;
- creates the same empty production workspace scaffold as normal registration; and
- does **not** create demo Areas, Projects, Tasks, Dates, or Daily Notes.

Do not use `npm run db:seed` as an account-provisioning tool. The demo seed is intentionally destructive for its configured demo workspace and is reserved for local or disposable preview environments.

## Recover a forgotten password

Reset an existing account to a generated temporary password:

```bash
npm run account:reset-password -- user@example.com --generate-password
```

Or provide the replacement password on stdin:

```bash
read -rsp "Replacement ContextOS password: " CONTEXTOS_PASSWORD
printf '\n'
printf '%s' "$CONTEXTOS_PASSWORD" | npm run account:reset-password -- user@example.com --password-stdin
unset CONTEXTOS_PASSWORD
```

An operator password reset:

- changes only the account password hash;
- revokes **all** server sessions for that account;
- leaves canonical Areas, Projects, Tasks, Dates, Daily Notes, local-first server state, and other non-authentication workspace records unchanged; and
- does not create a browser session automatically.

Previously cached workspace data may still remain on offline client devices. Revoking server sessions prevents those devices from authenticating or synchronizing again until the new password is used to establish a fresh server session. This is not remote device erasure.

## Password handling boundary

The operator CLI never accepts a password as a command-line argument. Use exactly one of:

- `--generate-password`, which creates a random 32-character base64url temporary password and prints it after a successful operation; or
- `--password-stdin`, which reads one password value from stdin.

Avoid piping a literal password from a command that will be retained in shell history. Also avoid generated-password mode in uncontrolled CI logs or shared terminal recordings, because the temporary password is deliberately printed for the operator to deliver.

## Trust boundary

These commands are not public application endpoints and do not weaken `ALLOW_PUBLIC_REGISTRATION=false`. Anyone with a shell that can run them against `DATABASE_URL` already has privileged database access and must be treated as a deployment operator.

ContextOS still does not provide email verification or self-service password reset. The operator reset is the supported recovery path for bounded self-hosted deployments that deliberately choose not to add an outbound email provider.

# Keycloak BFF Authentication

Nexo uses a Backend-for-Frontend authentication flow. React never receives the
Keycloak `client_secret`, `access_token`, or `refresh_token`; the browser only
keeps an `HttpOnly` session cookie issued by `Nexo.Server`.

## Flow

```text
Browser -> /login on React
React -> /auth/login on Nexo.Server
Nexo.Server -> Keycloak authorization endpoint
Keycloak -> /auth/callback on Nexo.Server with code
Nexo.Server -> Keycloak token endpoint with client_secret
Nexo.Server -> browser cookie __Host-nexo-bff and csrf cookie nexo.csrf
React -> /auth/me with credentials: include
```

`/auth/callback` is handled by ASP.NET Core OpenID Connect middleware through
the configured callback path.

## Why Tokens Stay Out Of React

React calls the backend with `credentials: "include"` and uses `/auth/me` to
restore session state. It does not store tokens in `localStorage`,
`sessionStorage`, or JavaScript variables. This reduces exposure to XSS token
theft and keeps the confidential Keycloak client secret strictly server-side.

## Backend Configuration

Non-sensitive defaults live in `Nexo.Server/appsettings.json`:

```json
{
  "Keycloak": {
    "Authority": "https://identity.example.invalid/realms/nexo",
    "Realm": "nexo",
    "ClientId": "nexo-web-bff",
    "CallbackPath": "/auth/callback",
    "LogoutRedirectUri": "http://localhost:5173/login",
    "Scopes": [ "openid", "profile", "email" ]
  }
}
```

Override `Authority`, `Realm`, `ClientId`, `ClientSecret`, and
`LogoutRedirectUri` for each local or deployed environment through
`Nexo.AppHost`. The committed values are placeholders and do not identify a
shared Keycloak instance.

Set local values with AppHost user secrets:

```powershell
dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_ISSUER" "<realm-issuer-url>"
dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_REALM" "<realm-name>"
dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_CLIENT_ID" "<client-id>"
dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_CLIENT_SECRET" "<secret-value>"
dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_REDIRECT_URI" "http://localhost:5173/login"
```

`Nexo.AppHost` exposes these values as Aspire external parameters and forwards
them to `Nexo.Server` as `Keycloak:*` configuration. `KEYCLOAK_CLIENT_SECRET`
is marked as a secret parameter. Do not commit `KEYCLOAK_CLIENT_SECRET`.

For production, set `KeyVault:Uri` and store `Keycloak--ClientSecret` in Azure
Key Vault. `Nexo.Server` loads Key Vault in non-development environments using
`DefaultAzureCredential`.

## Keycloak Client

Recommended client settings:

- Client type: confidential.
- Standard authorization code flow enabled.
- Direct access grants disabled unless a separate trusted flow needs them.
- Valid redirect URI: the browser-facing `/auth/callback` URL. For Aspire
  Vite URLs, allow `http://webfrontend-nexo.dev.localhost/*`; for plain
  localhost, allow `http://localhost/*`.
- Valid post logout redirect URI: the configured `LogoutRedirectUri`.
- Web origins: the React origin, for example `http://localhost:5173`.
- Scopes: `openid`, `profile`, `email`; add `offline_access` only when long
  lived refresh is required.

If Keycloak organizations are enabled, map organization claims in Keycloak
first. Nexo reads the Keycloak `organization` claim and extracts the nested
organization `id`; it does not invent tenant claims or accept a configured
development organization id.

## Endpoints

- `GET /auth/login`: starts the Keycloak challenge.
- `/auth/callback`: OIDC middleware callback path.
- `GET /auth/me`: returns the current authenticated session, claims, roles,
  and possible organization id.
- `POST /auth/refresh`: refreshes server-side tokens using the protected
  refresh token.
- `POST /auth/logout`: clears the local session. Use `?federated=true` when
  the caller wants a Keycloak logout URL in the response.

Mutable requests require the `X-CSRF-TOKEN` header to match the `nexo.csrf`
cookie. The frontend BFF fetch helper adds this header automatically.

## Refresh Token Behavior

ASP.NET Core stores OIDC tokens in protected authentication properties inside
the encrypted server-issued cookie. Before an access token expires, cookie
validation refreshes tokens through Keycloak using the server-side refresh token
and confidential client secret. `/auth/refresh` exposes the same refresh
operation explicitly to React.

The BFF disables OAuth pushed authorization requests (PAR) for Keycloak because
some Keycloak deployments advertise the PAR endpoint but reject ASP.NET Core's
pre-authorization request with a generic `invalid_request`.

If refresh fails, Nexo rejects the principal, clears the local session, and
returns `401`. React should then send the user back through `/auth/login`.

For horizontally scaled production deployments, persist ASP.NET Core Data
Protection keys in a shared backing store and protect those keys with Azure Key
Vault so every server instance can decrypt the BFF session cookie.

## Frontend Behavior

React uses:

```ts
fetch('/auth/me', { credentials: 'include' });
```

The Vite dev proxy forwards `/auth` and `/v1` to `Nexo.Server` and sends
forwarded host/proto headers so the BFF callback URI stays on the
browser-facing frontend origin. A `VITE_API_BASE_URL` can be used when the
frontend and backend are on different origins.

## Testing The Flow

1. Configure the local secret:

   ```powershell
   dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_REALM" "<realm-name>"
   dotnet user-secrets set --project .\Nexo.AppHost "KEYCLOAK_CLIENT_SECRET" "<secret-value>"
   ```

2. Start Aspire:

   ```powershell
   dotnet run --project .\Nexo.AppHost
   ```

3. Open the frontend and browse to `/login`.
4. Complete Keycloak login.
5. Verify `/auth/me` returns `isAuthenticated: true`.
6. Call `POST /auth/refresh` with credentials and the CSRF header.
7. Use the sidebar logout button or call `POST /auth/logout`.

## Troubleshooting

- `Keycloak:ClientSecret is required`: set the `KEYCLOAK_CLIENT_SECRET`
  Aspire parameter or AppHost user secret.
- `Keycloak:Authority must be configured for this environment`: set
  `KEYCLOAK_ISSUER` to the real Keycloak realm issuer URL. The committed
  `https://identity.example.invalid/realms/nexo` value is only a placeholder.
- `OperationCanceledException` during `/auth/login`: the backend could not
  load OpenID Connect discovery metadata from the configured
  `Keycloak:Authority`. Verify `KEYCLOAK_ISSUER` points to a reachable realm
  issuer URL and is not still using the placeholder authority.
- `invalid_request` from `GetPushedAuthorizationRequestUri`: Keycloak rejected
  the pushed authorization request. Nexo disables PAR for the Keycloak BFF
  client so login uses the standard authorization-code redirect.
- Redirect URI mismatch: ensure the Keycloak client allows the exact
  browser-facing `/auth/callback` origin. With Aspire's frontend URL this is
  typically `http://webfrontend-nexo.dev.localhost/*`.
- `/auth/me` returns `401`: the BFF cookie is missing, expired, rejected, or
  could not be decrypted.
- CSRF errors on POST/PUT/PATCH/DELETE: ensure the browser has `nexo.csrf` and
  the request sends `X-CSRF-TOKEN`.
- Refresh returns `401`: the refresh token is missing, expired, rotated without
  the new value being stored, or rejected by Keycloak.

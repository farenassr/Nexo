import {
  nexoServerModulesSharedAuthFeaturesAuthMeEndpoint,
  nexoServerModulesSharedAuthFeaturesLogoutEndpoint,
  nexoServerModulesSharedAuthFeaturesRefreshEndpoint,
} from "../../../lib/api/generated/clients";
import type { AuthSessionResponse } from "../../../lib/api/generated/types";
import { getApiBaseUrl } from "../../../lib/api/bffFetch";
import { ApiClientError } from "../../../lib/api/generatedClient";

export type AuthSession = AuthSessionResponse;

export const anonymousSession: AuthSession = {
  isAuthenticated: false,
  userId: null,
  name: null,
  email: null,
  organizationId: null,
  roles: [],
};

export async function getCurrentSession(): Promise<AuthSession> {
  try {
    return await nexoServerModulesSharedAuthFeaturesAuthMeEndpoint();
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return anonymousSession;
    }

    throw new Error("No se pudo restaurar la sesion.");
  }
}

export async function refreshSession(): Promise<void> {
  try {
    await nexoServerModulesSharedAuthFeaturesRefreshEndpoint();
  } catch {
    throw new Error("No se pudo renovar la sesion.");
  }
}

export async function logout(): Promise<string | null> {
  try {
    await nexoServerModulesSharedAuthFeaturesLogoutEndpoint();
    return null;
  } catch {
    throw new Error("No se pudo cerrar la sesion.");
  }
}

export function redirectToLogin(
  returnUrl = globalThis.location?.pathname ?? "/",
) {
  const search = new URLSearchParams({ returnUrl });
  globalThis.location.assign(
    `${getApiBaseUrl()}/auth/login?${search.toString()}`,
  );
}

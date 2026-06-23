import { clearStoredSession, getAccessToken } from "./sessionStorage";

const DEFAULT_API_BASE_URL = "https://mychatbackend-eu2n.onrender.com";
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL
).replace(/\/$/, "");

let didLogApiBaseUrl = false;
let unauthorizedHandler: (() => void) | undefined;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error
      .map((item) =>
        typeof item?.msg === "string" ? item.msg : "請檢查輸入內容",
      )
      .join("\n");
  }
  return "API request failed";
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!didLogApiBaseUrl) {
    console.log(`[API] Base URL: ${API_BASE_URL}`);
    didLogApiBaseUrl = true;
  }

  const requiresAuth = options.auth !== false;
  const token = requiresAuth ? await getAccessToken() : null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(`無法連線到伺服器：${API_BASE_URL}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: undefined }));
    if (response.status === 401 && requiresAuth) {
      await clearStoredSession();
      unauthorizedHandler?.();
    }
    throw new Error(getErrorMessage(error.detail));
  }

  return response.json() as Promise<T>;
}

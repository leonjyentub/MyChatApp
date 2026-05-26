export const API_BASE_URL = "https://mychatbackend-eu2n.onrender.com";
// 這段要自己改成自己申請的伺服器網址喔
let didLogApiBaseUrl = false;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!didLogApiBaseUrl) {
    console.log(`[API] Base URL: ${API_BASE_URL}`);
    didLogApiBaseUrl = true;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "API request failed" }));
    throw new Error(error.detail ?? "API request failed");
  }

  return response.json();
}

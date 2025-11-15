// Frontend/src/lib/api.js
export async function api(url, options = {}) {
  const { method = "GET", body, headers = {}, auth } = options; // auth: "required" | undefined

  // ----- Get Clerk token (NO template) -----
  let token;
  try {
    if (window?.Clerk?.session?.getToken) {
      if (window.Clerk?.loaded === false && window.Clerk?.load) {
        try { await window.Clerk.load(); } catch {}
      }
      token = await window.Clerk.session.getToken();
    }
  } catch {}

  if (auth === "required" && !token) {
    throw new Error("Sign in required (401)");
  }

  // ----- Build headers/body safely -----
  const finalHeaders = { ...headers };
  let finalBody;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  const isString = typeof body === "string";

  if (body !== undefined) {
    if (isFormData || isBlob) {
      // We are not using FormData for events anymore, but keep this generic
      finalBody = body; // Let browser set boundary
    } else if (isString) {
      finalBody = body;
      finalHeaders["Content-Type"] ||= "application/json";
    } else {
      finalBody = JSON.stringify(body);
      finalHeaders["Content-Type"] ||= "application/json";
    }
  }

  if (token && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { method, headers: finalHeaders, body: finalBody });

  const parseJsonSafe = async () => { try { return await res.json(); } catch { return null; } };

  if (res.status === 401 || res.status === 403) {
    const data = await parseJsonSafe();
    const msg = data?.message || (res.status === 401 ? "Unauthorized" : "Forbidden");
    throw new Error(`${msg} (${res.status})`);
  }
  if (!res.ok) {
    const data = await parseJsonSafe();
    let msg = data?.message;
    if (!msg) { try { msg = await res.text(); } catch {} }
    msg ||= res.statusText || "Request failed";
    throw new Error(`${msg} (${res.status})`);
  }

  try { return await res.json(); } catch { return null; }
}

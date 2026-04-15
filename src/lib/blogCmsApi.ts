import { supabase } from "@/integrations/supabase/client";

const BLOG_CMS_BASE_URL = "https://zwvwatnrxxusmhuibdfv.supabase.co/functions/v1/blog-cms";
const BLOG_CMS_API_KEY = "plg_live_8f3k2j9s0d7f6g5h4j3k2l1m";

export async function blogCmsApi<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${BLOG_CMS_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "x-cms-api-key": BLOG_CMS_API_KEY,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function uploadBlogImage(file: File, folder: string = "blog-images"): Promise<string> {
  const { signedUrl, publicUrl } = await blogCmsApi<{ signedUrl: string; publicUrl: string; path: string }>(
    "POST",
    "/upload-url",
    { fileName: file.name, folder }
  );

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) throw new Error("Failed to upload image");
  return publicUrl;
}

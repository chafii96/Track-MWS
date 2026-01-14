export async function randomId(bytes = 16): Promise<string> {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // URL-safe base64
  const bin = String.fromCharCode(...Array.from(arr));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function siteId(): Promise<string> {
  return `site_${await randomId(12)}`;
}

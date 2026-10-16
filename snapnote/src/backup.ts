import { validateWorkspace, type Workspace } from "./workspace";

export const encode = (bytes: Uint8Array) => {
  let result = "";
  for (let i = 0; i < bytes.length; i += 8192)
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
};
export const decode = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export async function keyFor(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptRecord(value: unknown, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const result = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return { iv: encode(iv), data: encode(new Uint8Array(result)) };
}
export async function decryptRecord(
  value: { iv: string; data: string },
  key: CryptoKey,
) {
  const result = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(value.iv) },
    key,
    decode(value.data),
  );
  return JSON.parse(new TextDecoder().decode(result));
}
export async function createBackup(workspace: Workspace, password: string) {
  if (!password) return JSON.stringify(workspace, null, 2);
  if (password.length < 10)
    throw new Error("Use at least 10 characters for the backup password.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await keyFor(password, salt),
    new TextEncoder().encode(JSON.stringify(workspace)),
  );
  return JSON.stringify({
    format: "snapnote-encrypted-v1",
    salt: encode(salt),
    iv: encode(iv),
    data: encode(new Uint8Array(ciphertext)),
  });
}
export async function readBackup(
  text: string,
  password: string,
): Promise<Workspace> {
  if (text.length > 200_000_000)
    throw new Error("Backup is too large (maximum 200 MB).");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (parsed?.format === "snapnote-encrypted-v1") {
    if (
      ![parsed.salt, parsed.iv, parsed.data].every((x) => typeof x === "string")
    )
      throw new Error("Invalid encrypted backup.");
    try {
      const salt = decode(parsed.salt),
        iv = decode(parsed.iv);
      if (salt.length !== 16 || iv.length !== 12)
        throw new Error("Invalid encryption parameters.");
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        await keyFor(password, salt),
        decode(parsed.data),
      );
      parsed = JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
      throw new Error(
        "Unable to unlock this backup. Check the password and file.",
      );
    }
  }
  return validateWorkspace(parsed);
}

// Gmail's own blocked-attachment-extension list — confirmed against
// https://support.google.com/mail/answer/6590 (Google updates this list
// periodically). Rejecting these client- and server-side fails fast with a
// clear message instead of the send silently bouncing later. Gmail applies
// this even to a compressed form of the file (e.g. "virus.exe.gz") and to
// files found inside an archive (.zip/.tgz) — we check the former (a
// trailing .gz/.bz2 is stripped before checking the extension) but not the
// latter, since inspecting inside an uploaded archive would need a zip
// parser; Gmail's own server-side scan is still the backstop for that case.
export const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  ".ade",
  ".adp",
  ".apk",
  ".appx",
  ".appxbundle",
  ".bat",
  ".cab",
  ".chm",
  ".cmd",
  ".com",
  ".cpl",
  ".diagcab",
  ".diagcfg",
  ".diagpkg",
  ".dll",
  ".dmg",
  ".ex",
  ".ex_",
  ".exe",
  ".hta",
  ".img",
  ".ins",
  ".iso",
  ".isp",
  ".jar",
  ".jnlp",
  ".js",
  ".jse",
  ".lib",
  ".lnk",
  ".mde",
  ".mjs",
  ".msc",
  ".msi",
  ".msix",
  ".msixbundle",
  ".msp",
  ".mst",
  ".nsh",
  ".pif",
  ".ps1",
  ".scr",
  ".sct",
  ".shb",
  ".sys",
  ".vb",
  ".vbe",
  ".vbs",
  ".vhd",
  ".vxd",
  ".wsc",
  ".wsf",
  ".wsh",
  ".xll",
]);

export const MAX_ATTACHMENTS_TOTAL_BYTES = 25 * 1024 * 1024; // Gmail's advertised attachment limit.

export function getEffectiveExtension(filename: string): string {
  let name = filename.toLowerCase();
  if (name.endsWith(".gz") || name.endsWith(".bz2")) {
    name = name.slice(0, name.lastIndexOf("."));
  }
  const lastDot = name.lastIndexOf(".");
  return lastDot === -1 ? "" : name.slice(lastDot);
}

export function isBlockedAttachment(filename: string): boolean {
  return BLOCKED_ATTACHMENT_EXTENSIONS.has(getEffectiveExtension(filename));
}

export interface AttachmentLike {
  name: string;
  size: number;
}

/** Shared by the client (fail fast) and the server (never trust the client). */
export function validateAttachments(files: AttachmentLike[]): string[] {
  const errors: string[] = [];

  for (const file of files) {
    if (isBlockedAttachment(file.name)) {
      errors.push(`"${file.name}" is a file type Gmail blocks and can't be attached.`);
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_ATTACHMENTS_TOTAL_BYTES) {
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    errors.push(`Attachments total ${totalMb}MB, over the 25MB limit.`);
  }

  return errors;
}

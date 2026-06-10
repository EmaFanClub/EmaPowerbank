export const FEEDBACK_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const FEEDBACK_MAX_ATTACHMENTS = 10;
export const FEEDBACK_IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif,image/heic,image/heif";

const FEEDBACK_IMAGE_NAME_PATTERN = /\.(png|jpe?g|gif|webp|bmp|avif|hei[cf])$/i;
const FEEDBACK_IMAGE_TYPES = new Set(FEEDBACK_IMAGE_ACCEPT.split(","));

export type FeedbackAttachmentSelectionError = "tooMany" | "invalidType" | "tooLarge";

export type FeedbackAttachmentSelectionResult =
  | { ok: true; attachments: File[] }
  | { ok: false; attachments: File[]; reason: FeedbackAttachmentSelectionError };

export function isAcceptedFeedbackImage(file: File) {
  return FEEDBACK_IMAGE_TYPES.has(file.type) || (!file.type && FEEDBACK_IMAGE_NAME_PATTERN.test(file.name));
}

function fileSelectionKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

export function mergeFeedbackAttachmentSelection(
  current: File[],
  selected: File[],
): FeedbackAttachmentSelectionResult {
  if (selected.length === 0) return { ok: true, attachments: current };

  if (selected.some((file) => !isAcceptedFeedbackImage(file))) {
    return { ok: false, attachments: current, reason: "invalidType" };
  }
  if (selected.some((file) => file.size > FEEDBACK_ATTACHMENT_MAX_BYTES)) {
    return { ok: false, attachments: current, reason: "tooLarge" };
  }

  const seen = new Set(current.map(fileSelectionKey));
  const attachments = [...current];
  for (const file of selected) {
    const key = fileSelectionKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    attachments.push(file);
  }

  if (attachments.length > FEEDBACK_MAX_ATTACHMENTS) {
    return { ok: false, attachments: current, reason: "tooMany" };
  }

  return { ok: true, attachments };
}

/**
 * Canonical CoreStudio image-ingress protocol.
 *
 * This module stays inside the desktop adapter boundary. The upstream canvas
 * keeps its own existing image support; a contract test verifies parity.
 */
export const IMAGE_FORMATS = {
  png: {
    extensions: ["png"],
    canonicalMimeType: "image/png",
    inputMimeTypes: ["image/png"],
  },
  jpeg: {
    extensions: ["jpg", "jpeg", "jfif"],
    canonicalMimeType: "image/jpeg",
    inputMimeTypes: ["image/jpeg", "image/jfif"],
  },
  webp: {
    extensions: ["webp"],
    canonicalMimeType: "image/webp",
    inputMimeTypes: ["image/webp"],
  },
  avif: {
    extensions: ["avif"],
    canonicalMimeType: "image/avif",
    inputMimeTypes: ["image/avif"],
  },
  gif: {
    extensions: ["gif"],
    canonicalMimeType: "image/gif",
    inputMimeTypes: ["image/gif"],
  },
  bmp: {
    extensions: ["bmp"],
    canonicalMimeType: "image/bmp",
    inputMimeTypes: ["image/bmp"],
  },
  ico: {
    extensions: ["ico"],
    canonicalMimeType: "image/x-icon",
    inputMimeTypes: ["image/x-icon"],
  },
  svg: {
    extensions: ["svg"],
    canonicalMimeType: "image/svg+xml",
    inputMimeTypes: ["image/svg+xml"],
  },
} as const;

type ImageFormat = typeof IMAGE_FORMATS[keyof typeof IMAGE_FORMATS];
type ImageFileExtension = ImageFormat["extensions"][number];
type ImageCanonicalMimeType = ImageFormat["canonicalMimeType"];
type ImageInputMimeType = ImageFormat["inputMimeTypes"][number];

export const IMAGE_FILE_EXTENSIONS = Object.freeze(
  Object.values(IMAGE_FORMATS).flatMap(({ extensions }) => extensions),
) as readonly ImageFileExtension[];

export const IMAGE_MIME_TYPE_BY_EXTENSION = Object.freeze(
  Object.fromEntries(
    Object.values(IMAGE_FORMATS).flatMap((format) =>
      format.extensions.map((extension) => [
        extension,
        format.canonicalMimeType,
      ]),
    ),
  ),
) as Readonly<Record<ImageFileExtension, ImageCanonicalMimeType>>;

export const IMAGE_INPUT_MIME_TYPES = Object.freeze([
  ...new Set(
    Object.values(IMAGE_FORMATS).flatMap(
      ({ inputMimeTypes }) => inputMimeTypes,
    ),
  ),
]) as readonly ImageInputMimeType[];

import { useEffect, useState } from "react";
import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
import { readImagePalette } from "../imageColors";
import "./ImagePalette.css";

export type ReadPaletteOriginal = (
  fileId: string,
) => Promise<ProjectAssetPayload | undefined>;
interface ImagePaletteProps {
  projectPath?: string | null;
  fileId: string;
  image?: HTMLImageElement | null;
  readOriginal?: ReadPaletteOriginal;
  onCopyText: (text: string) => void;
}

const PaletteColors = ({
  image,
  loadFailed,
  onCopyText,
}: {
  image: HTMLImageElement | null;
  loadFailed: boolean;
  onCopyText: (text: string) => void;
}) => {
  const [palette, setPalette] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setPalette(null);
    setFailed(false);
    if (!image) return;
    const timer = window.setTimeout(() => {
      try {
        setPalette(readImagePalette(image));
      } catch {
        setFailed(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [image]);
  return (
    <section className="image-palette" aria-label={copy.imageColors.palette}>
      <h3>{copy.imageColors.palette}</h3>
      {palette?.length ? (
        <div className="image-palette__swatches">
          {palette.map((hex) => (
            <button
              key={hex}
              type="button"
              className="image-palette__swatch"
              aria-label={copy.imageColors.copyColor(hex)}
              title={copy.imageColors.copyColor(hex)}
              style={{ backgroundColor: hex }}
              onClick={() => onCopyText(hex)}
            />
          ))}
        </div>
      ) : (
        <p role="status">
          {failed || loadFailed
            ? copy.imageColors.paletteFailed
            : palette
            ? copy.imageColors.paletteEmpty
            : copy.imageColors.paletteLoading}
        </p>
      )}
    </section>
  );
};

const ImagePaletteContent = ({
  fileId,
  image,
  readOriginal,
  onCopyText,
}: ImagePaletteProps) => {
  const [asset, setAsset] = useState<ProjectAssetPayload>();
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (image !== undefined || !readOriginal) return;
    let current = true;
    void readOriginal(fileId)
      .then((value) => {
        if (!current) return;
        if (value?.fileId === fileId) setAsset(value);
        else setFailed(true);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [fileId, image, readOriginal]);
  return (
    <>
      <PaletteColors
        image={image === undefined ? source : image}
        loadFailed={failed}
        onCopyText={onCopyText}
      />
      {image === undefined && asset && (
        <img
          hidden
          alt=""
          src={`data:${asset.mimeType};base64,${asset.dataBase64}`}
          onLoad={async (event) => {
            const element = event.currentTarget;
            try {
              await element.decode?.();
              if (element.isConnected) setSource(element);
            } catch {
              if (element.isConnected) setFailed(true);
            }
          }}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
};

// Selection/project changes discard stale results and pending original-image responses.
export const ImagePalette = (props: ImagePaletteProps) => (
  <ImagePaletteContent
    key={`${props.projectPath ?? ""}:${props.fileId}`}
    {...props}
  />
);

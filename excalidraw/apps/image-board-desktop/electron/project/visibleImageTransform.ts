import type { ProjectRoomSceneElement } from "../../src/shared/projectRoomProtocol";

export interface VisibleImageTransform {
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null;
  width: number;
  height: number;
  angle: number;
  scale: [number, number];
}
const invalid = () =>
  Object.assign(new Error("参考图片的裁切或变换数据无效，请修复后重试。"), {
    code: "BAD_REQUEST",
  });
export const getVisibleImageTransform = (
  element: ProjectRoomSceneElement,
): VisibleImageTransform | null => {
  const angle = element.angle ?? 0;
  const scale = element.scale ?? [1, 1];
  if (
    typeof angle !== "number" ||
    !Number.isFinite(angle) ||
    !Array.isArray(scale) ||
    scale.length !== 2 ||
    scale.some((v) => v !== 1 && v !== -1)
  )
    throw invalid();
  if (!element.crop && angle === 0 && scale[0] === 1 && scale[1] === 1)
    return null;
  const { width, height } = element;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw invalid();
  const crop = element.crop as VisibleImageTransform["crop"];
  if (crop) {
    if (
      typeof crop !== "object" ||
      [
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        crop.naturalWidth,
        crop.naturalHeight,
      ].some((v) => typeof v !== "number" || !Number.isFinite(v)) ||
      crop.x < 0 ||
      crop.y < 0 ||
      crop.width <= 0 ||
      crop.height <= 0 ||
      crop.naturalWidth <= 0 ||
      crop.naturalHeight <= 0 ||
      crop.x + crop.width > crop.naturalWidth + 0.0001 ||
      crop.y + crop.height > crop.naturalHeight + 0.0001
    )
      throw invalid();
  }
  return {
    crop: crop ?? null,
    width,
    height,
    angle,
    scale: [scale[0], scale[1]],
  };
};

// Runs inside the existing sandboxed image decoder. Coordinates are scaled against
// the decoded original, not the display rendition or stale record dimensions.
export const visibleImageDrawExpression = (
  transform: VisibleImageTransform,
) => `
 const transform=${JSON.stringify(transform)};
 const crop=transform.crop;
 const sx=crop?crop.x*width/crop.naturalWidth:0, sy=crop?crop.y*height/crop.naturalHeight:0;
 const sw=crop?crop.width*width/crop.naturalWidth:width, sh=crop?crop.height*height/crop.naturalHeight:height;
 const resolution=Math.max(sw/transform.width,sh/transform.height);
 const dw=transform.width*resolution, dh=transform.height*resolution;
 const cos=Math.abs(Math.cos(transform.angle)), sin=Math.abs(Math.sin(transform.angle));
 const ow=Math.max(1,Math.ceil(dw*cos+dh*sin-1e-8)), oh=Math.max(1,Math.ceil(dw*sin+dh*cos-1e-8));
 if(!Number.isFinite(ow*oh)||ow*oh>64000000)throw Error('参考图片超过 6400 万像素限制。');
 const cropped=document.createElement('canvas');cropped.width=Math.max(1,Math.round(sw));cropped.height=Math.max(1,Math.round(sh));
 cropped.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,cropped.width,cropped.height);
 const output=document.createElement('canvas');output.width=ow;output.height=oh;
 const ctx=output.getContext('2d');ctx.translate(ow/2,oh/2);ctx.rotate(transform.angle);ctx.scale(...transform.scale);
 ctx.drawImage(cropped,-dw/2,-dh/2,dw,dh);
 return {width:ow,height:oh,dataBase64:output.toDataURL('image/png').split(',')[1]};
`;

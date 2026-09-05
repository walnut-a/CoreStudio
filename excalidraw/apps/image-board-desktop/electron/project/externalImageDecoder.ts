import { validateExternalImageHeader } from "./externalImageHeader";
import { BrowserWindow } from "electron";

// Decode in a sandboxed renderer, never on the editor or main process thread.
const decodeExpression = (
  data: string,
  mimeType: string,
  maxDimension: number,
) => `
(async () => {
 const raw=atob(${JSON.stringify(data)}), mime=${JSON.stringify(mimeType)};
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(mime==='image/png' && (raw.slice(1,4)!=='PNG'||raw.slice(-8,-4)!=='IEND')) throw Error('PNG 文件不完整。');
 if(mime==='image/jpeg' && (bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)) throw Error('JPEG 文件不完整。');
 if(mime==='image/webp' && (raw.slice(0,4)!=='RIFF'||raw.slice(8,12)!=='WEBP'||new DataView(bytes.buffer).getUint32(4,true)+8!==bytes.length)) throw Error('WebP 文件不完整。');
 if(mime==='image/svg+xml') {
  const text=new TextDecoder().decode(bytes), doc=new DOMParser().parseFromString(text,'image/svg+xml');
  if(doc.querySelector('parsererror,script,foreignObject')||doc.documentElement.localName!=='svg'||/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('SVG 格式无效或含有不支持的活动内容。');
  const sw=parseFloat(doc.documentElement.getAttribute('width')),sh=parseFloat(doc.documentElement.getAttribute('height')); if(sw>0&&sh>0&&sw*sh>64000000)throw Error('SVG 超过 6400 万像素限制。');
  for(const element of doc.querySelectorAll('*')) for(const attribute of element.attributes) {
   if(/^on/i.test(attribute.name)||(/href$/i.test(attribute.name)&&attribute.value&&!attribute.value.startsWith('#')&&!['png','jpeg','webp'].some(format=>attribute.value.toLowerCase().startsWith('data:image/'+format+';base64,')))||/url\\(\\s*[^#]/i.test(attribute.value)) throw Error('SVG 不能依赖外部内容。');
  }
  if(/@import|url\\(\\s*[^#]/i.test(text)) throw Error('SVG 不能依赖外部内容。');
 }
 const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
 try {
  const img=new Image();img.src=url;await img.decode();
  const width=img.naturalWidth,height=img.naturalHeight;
  if(!width||!height||width*height>64000000)throw Error('图片尺寸无效或超过 6400 万像素限制。');
  const limit=${JSON.stringify(maxDimension)};
  if(!limit) return {width,height};
  const scale=Math.min(1,limit/Math.max(width,height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return {width:canvas.width,height:canvas.height,dataBase64:canvas.toDataURL('image/png').split(',')[1]};
 } finally {URL.revokeObjectURL(url);}
})()`;

export const createExternalImageDecoder = () => {
  let tail: Promise<unknown> = Promise.resolve();
  const decode = (buffer: Buffer, mimeType: string, maxDimension = 0) => {
    const job = tail.then(async () => {
      validateExternalImageHeader(buffer, mimeType);
      const worker = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          backgroundThrottling: false,
        },
      });
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          (async () => {
            await worker.loadURL(
              "data:text/html," +
                encodeURIComponent(
                  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src blob: data:; style-src 'none'; connect-src 'none'\">",
                ),
            );
            return (await worker.webContents.executeJavaScript(
              decodeExpression(
                buffer.toString("base64"),
                mimeType,
                maxDimension,
              ),
            )) as { width: number; height: number; dataBase64?: string };
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("图片解码超时，请检查文件后重试。")),
              15000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timeout);
        if (!worker.isDestroyed()) worker.destroy();
      }
    });
    tail = job.catch(() => undefined);
    return job;
  };
  return { decode };
};

declare module "aframe";

declare module "mind-ar/dist/mindar-image-aframe.prod.js";

declare module "mind-ar/dist/mindar-image.prod.js" {
  export class Compiler {
    compileImageTargets(images: HTMLImageElement[], onProgress?: (percent: number) => void): Promise<unknown[]>;
    exportData(): Promise<Uint8Array>;
  }
}

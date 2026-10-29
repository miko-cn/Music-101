// subset-font 是纯 JS，没有类型声明；这里只声明用到的签名。
declare module "subset-font" {
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: {
      targetFormat?: "woff2" | "woff" | "truetype";
      variationAxes?: Record<string, { min: number; max: number }>;
    },
  ): Promise<Buffer>;
}

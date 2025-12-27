// Type declarations for modules without TypeScript definitions

declare module "pdf-parse" {
  interface PDFData {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown> | null
    text: string
    version: string
  }

  interface PDFOptions {
    pagerender?: (pageData: {
      pageIndex: number
      getTextContent: () => Promise<{
        items: Array<{ str: string }>
      }>
    }) => Promise<string>
    max?: number
  }

  function pdfParse(
    dataBuffer: Buffer | ArrayBuffer | Uint8Array,
    options?: PDFOptions
  ): Promise<PDFData>

  export = pdfParse
}

declare module "mime-types" {
  export function lookup(path: string): string | false
  export function contentType(type: string): string | false
  export function extension(type: string): string | false
  export function charset(type: string): string | false
  export const types: Record<string, string>
  export const extensions: Record<string, string[]>
}

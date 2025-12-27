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

declare module "word-extractor" {
  interface Document {
    getBody(): string
    getHeaders(): string[]
    getFooters(): string[]
    getAnnotations(): string[]
  }

  class WordExtractor {
    extract(filePath: string | Buffer): Promise<Document>
  }

  export = WordExtractor
}

declare module "express" {
  import { Server } from "http"

  interface Request {
    body: unknown
    params: Record<string, string>
    query: Record<string, string | string[] | undefined>
    headers: Record<string, string | string[] | undefined>
    method: string
    url: string
    path: string
  }

  interface Response {
    status(code: number): Response
    json(body: unknown): Response
    send(body: unknown): Response
    end(): void
    set(field: string, value: string): Response
  }

  type NextFunction = (err?: unknown) => void
  type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>

  interface Router {
    use(...handlers: RequestHandler[]): Router
    get(path: string, ...handlers: RequestHandler[]): Router
    post(path: string, ...handlers: RequestHandler[]): Router
    put(path: string, ...handlers: RequestHandler[]): Router
    delete(path: string, ...handlers: RequestHandler[]): Router
  }

  interface Application extends Router {
    listen(port: number, callback?: () => void): Server
  }

  function express(): Application

  export = express
}

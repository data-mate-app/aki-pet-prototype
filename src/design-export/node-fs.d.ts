// テストが tokens.css・design/ を読むためだけの型。@types/node を足さずに済ませる
declare module 'node:fs' {
  export function readFileSync(path: URL | string, encoding: 'utf8'): string;
  export function existsSync(path: URL | string): boolean;
}

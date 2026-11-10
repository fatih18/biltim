/*
 * The audit page's source, for the wiring guards (auditRecordWiring.test.ts,
 * correctionWiring.test.ts). The page is a ~5000-line client component with no
 * render harness, so what its wiring must do is checked on its text. A guard
 * that cannot find what it reads fails by name instead of passing on nothing.
 */
export const pageSource = (await Bun.file(new URL("../page.tsx", import.meta.url)).text()).replace(/\r\n/g, "\n");

export const withoutComments = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/ .*$/gm, "");

/** A function body shorter than this is the wrong span, not a function. */
const MIN_BODY = 120;

/** The page's code with the comments removed. */
export const pageCode = withoutComments(pageSource);

/**
 * The body of one of the component's own functions, comments removed (they end
 * at the line `  }`). Throws, naming the function, when it is not there or the
 * span found is too short to be it: a renamed function must break the guard.
 */
export function bodyOf(name: string): string {
  const start = pageSource.indexOf(`\n  const ${name} = `);
  if (start < 0) throw new Error(`page.tsx has no function ${name}`);
  const end = pageSource.indexOf("\n  }\n", start);
  if (end < 0) throw new Error(`page.tsx: the end of ${name} was not found`);
  const body = withoutComments(pageSource.slice(start, end + "\n  }\n".length));
  if (body.length < MIN_BODY) throw new Error(`page.tsx: ${name} is only ${body.length} characters; the span is wrong`);
  return body;
}

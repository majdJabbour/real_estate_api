import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("renders the API reference resolved through the TypeScript alias in Node", () => {
  const html = renderToStaticMarkup(createElement(Home));

  expect(html).toContain("<main");
  expect(html).toContain('<h1 id="api-title">Real Estate API</h1>');
  expect(html).toContain('href="/api/v1/health"');
  expect(html.match(/data-method="(?:GET|PUT|DELETE)"/g)).toHaveLength(9);
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("renders the scaffold page resolved through the TypeScript alias in Node", () => {
  const html = renderToStaticMarkup(createElement(Home));

  expect(html).toContain("<main");
  expect(html).toContain("<h1>");
});

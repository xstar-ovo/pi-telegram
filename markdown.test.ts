import { expect, test } from "bun:test";
import { mdToHtml } from "./markdown.ts";

test("bold, italic, strike, inline code", () => {
	expect(mdToHtml("**a**")).toBe("<b>a</b>");
	expect(mdToHtml("*a*")).toBe("<i>a</i>");
	expect(mdToHtml("~~a~~")).toBe("<s>a</s>");
	expect(mdToHtml("`a<b`")).toBe("<code>a&lt;b</code>");
});

test("heading becomes bold, list stays plain", () => {
	expect(mdToHtml("## Title")).toBe("<b>Title</b>");
	expect(mdToHtml("- one\n- two")).toBe("- one\n- two");
});

test("fenced code is escaped and wrapped", () => {
	expect(mdToHtml("```ts\nconst a = 1 < 2;\n```")).toBe("<pre><code>const a = 1 &lt; 2;</code></pre>");
});

test("links keep the url escaped", () => {
	expect(mdToHtml("[x](https://e.com/?a=1&b=2)")).toBe('<a href="https://e.com/?a=1&amp;b=2">x</a>');
});

test("plain text is escaped, no tags invented", () => {
	expect(mdToHtml("a & b > c")).toBe("a &amp; b &gt; c");
	// underscores in identifiers and arithmetic asterisks must stay literal
	expect(mdToHtml("snake_case_name and 2*3*4")).toBe("snake_case_name and 2*3*4");
});

test("mixed text keeps order", () => {
	expect(mdToHtml("see **this** and `that`")).toBe("see <b>this</b> and <code>that</code>");
});

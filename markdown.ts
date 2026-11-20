// Minimal Markdown -> Telegram HTML.
// Escape first, then insert tags, so tags are never double-escaped.
// Anything Telegram rejects makes the caller fall back to plain text.

const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(segment: string): string {
	let out = escapeHtml(segment);
	out = out.replace(/^#{1,6}[ \t]+(.+)$/gm, "<b>$1</b>");
	out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
	out = out.replace(/\*\*([^\n]+?)\*\*/g, "<b>$1</b>");
	out = out.replace(/~~([^\n]+?)~~/g, "<s>$1</s>");
	out = out.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
	// italic last, so it cannot eat the markers of bold
	out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<i>$2</i>");
	return out;
}

// Telegram's HTML mode has no <table>, so a table becomes one aligned <pre> block.
// CJK glyphs are two columns wide in monospace, hence cellWidth.
const WIDE_CHAR = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u3000-\u303E]/;
const cellWidth = (text: string): number => Array.from(text).reduce((n, ch) => n + (WIDE_CHAR.test(ch) ? 2 : 1), 0);
const isSeparator = (line: string): boolean => /^\s*\|?(\s*:?-+:?\s*\|)*\s*:?-+:?\s*\|?\s*$/.test(line) && line.includes("-");
const splitRow = (line: string): string[] =>
	line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());

function renderTable(header: string[], rows: string[][]): string {
	const cols = Math.max(header.length, ...rows.map((row) => row.length));
	const grid = [header, ...rows].map((row) => Array.from({ length: cols }, (_, i) => row[i] ?? ""));
	const widths = Array.from({ length: cols }, (_, i) => Math.max(...grid.map((row) => cellWidth(row[i] ?? ""))));
	const format = (row: string[]): string =>
		row.map((cell, i) => cell + " ".repeat(Math.max(0, (widths[i] ?? 0) - cellWidth(cell)))).join("  ").trimEnd();
	const ruler = widths.map((w) => "-".repeat(w)).join("  ");
	// shortcut: wide tables wrap on a phone screen, switch to sendRichMessage if that matters
	return `<pre>${escapeHtml([format(grid[0] ?? []), ruler, ...grid.slice(1).map(format)].join("\n"))}</pre>`;
}

function renderPlain(segment: string): string {
	const lines = segment.split("\n");
	let out = "";
	let plain: string[] = [];
	const push = (chunk: string): void => {
		if (out !== "" && !out.endsWith("\n")) out += "\n";
		out += chunk;
	};
	const flush = (): void => {
		if (plain.length > 0) push(inline(plain.join("\n")));
		plain = [];
	};
	for (let j = 0; j < lines.length; j++) {
		const line = lines[j] ?? "";
		if (line.includes("|") && isSeparator(lines[j + 1] ?? "")) {
			flush();
			const rows: string[][] = [];
			let k = j + 2;
			while (k < lines.length && (lines[k] ?? "").includes("|") && (lines[k] ?? "").trim() !== "") {
				rows.push(splitRow(lines[k] ?? ""));
				k++;
			}
			push(renderTable(splitRow(line), rows));
			j = k - 1;
		} else {
			plain.push(line);
		}
	}
	flush();
	return out;
}

export function mdToHtml(markdown: string): string {
	const blocks = markdown.split(/```/);
	let out = "";
	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i] ?? "";
		if (i % 2 === 1) {
			// odd segment = fenced code; drop the language line, keep the body
			const body = block.replace(/^[^\n]*\n/, "").replace(/\n$/, "");
			out += `<pre><code>${escapeHtml(body)}</code></pre>`;
		} else {
			out += renderPlain(block);
		}
	}
	return out.trim();
}

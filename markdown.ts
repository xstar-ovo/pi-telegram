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
			out += inline(block);
		}
	}
	return out.trim();
}

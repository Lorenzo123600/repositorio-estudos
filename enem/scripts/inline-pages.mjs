export function inlinePages(html,js,css){
 // Callback replacements preserve literal $&, $1, $` and $' inside bundled code.
 const safeJS=js.replace(/<\/script/gi,'<\\/script');
 return html.replace(/<script(?=[^>]*type="module")[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script type="module">${safeJS}</script>`).replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
}

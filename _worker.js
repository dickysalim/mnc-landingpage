export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Don't rewrite global-blocks files or static assets
    if (url.pathname.startsWith('/global-blocks/') || url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    // Rewrite URL to look inside landing-pages/
    const rewrittenUrl = new URL(request.url);
    rewrittenUrl.pathname = '/landing-pages' + url.pathname;
    const response = await env.ASSETS.fetch(new Request(rewrittenUrl.toString(), request));

    // Only rewrite HTML responses
    if (!response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    const fetchBlock = async (blockPath) => {
      try {
        const blockUrl = new URL(blockPath, request.url);
        const res = await env.ASSETS.fetch(new Request(blockUrl.toString()));
        if (!res.ok) return '';
        return await res.text();
      } catch {
        return '';
      }
    };

    // Load manifest and fixed blocks in parallel
    const [manifestText, headerHtml, footerHtml] = await Promise.all([
      fetchBlock('/global-blocks/blocks-manifest.json'),
      fetchBlock('/global-blocks/block001-header.html'),
      fetchBlock('/global-blocks/block002-footer.html'),
    ]);

    // Parse manifest — fallback to empty object if something goes wrong
    let manifest = {};
    try { manifest = JSON.parse(manifestText); } catch {}

    return new HTMLRewriter()
      .on('#global-header', {
        element(el) { el.replace(headerHtml, { html: true }); }
      })
      .on('#global-block', {
        async element(el) {
          const blockId = el.getAttribute('data-block');
          const blockFile = manifest[blockId];
          if (blockFile) {
            const blockHtml = await fetchBlock('/global-blocks/' + blockFile);
            el.replace(blockHtml, { html: true });
          } else {
            el.remove();
          }
        }
      })
      .on('#global-footer', {
        element(el) { el.replace(footerHtml, { html: true }); }
      })
      .transform(response);
  }
}

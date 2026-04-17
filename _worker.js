export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Don't rewrite global-blocks files or static assets
    if (url.pathname.startsWith('/global-blocks/') || url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    // Extract the LP path slug (e.g. "ab-test-staging" from "/ab-test-staging")
    const pathParts = url.pathname.replace(/^\//, '').split('/');
    const lpSlug = pathParts[0];

    // Fetch abtest_config.json for this LP
    const fetchAsset = async (assetPath) => {
      try {
        const assetUrl = new URL(assetPath, request.url);
        const res = await env.ASSETS.fetch(new Request(assetUrl.toString()));
        if (!res.ok) return null;
        return await res.text();
      } catch {
        return null;
      }
    };

    // Load the config
    const configText = await fetchAsset(`/landing-pages/${lpSlug}/abtest_config.json`);
    let variantId = 'variant001'; // safe default

    if (configText) {
      try {
        const config = JSON.parse(configText);
        if (config.enabled && config.variants && config.variants.length > 0) {
          // Weighted random selection
          const total = config.variants.reduce((sum, v) => sum + v.weight, 0);
          let rand = Math.random() * total;
          for (const variant of config.variants) {
            rand -= variant.weight;
            if (rand <= 0) {
              variantId = variant.id;
              break;
            }
          }
        } else if (config.variants && config.variants.length > 0) {
          // A/B test disabled — always serve first variant
          variantId = config.variants[0].id;
        }
      } catch {}
    }

    // Fetch the selected variant's index.html
    const variantPath = `/landing-pages/${lpSlug}/${variantId}/index.html`;
    const response = await fetchAsset(variantPath).then(html => {
      if (!html) return null;
      return new Response(html, {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      });
    });

    if (!response) {
      return new Response('Page not found', { status: 404 });
    }

    // Fetch global blocks
    const fetchBlock = async (blockPath) => {
      const text = await fetchAsset(blockPath);
      return text || '';
    };

    // Load manifest
    const manifestText = await fetchBlock('/global-blocks/blocks-manifest.json');
    let manifest = {};
    try { manifest = JSON.parse(manifestText); } catch {}

    const [headerHtml, footerHtml] = await Promise.all([
      fetchBlock('/global-blocks/' + (manifest['block001'] || 'block001-header.html')),
      fetchBlock('/global-blocks/' + (manifest['block002'] || 'block002-footer.html')),
    ]);

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

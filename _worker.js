export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Don't rewrite global-blocks files or static assets
    if (url.pathname.startsWith('/global-blocks/') || url.pathname.startsWith('/global-utilities/') || url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    // Extract the LP path slug (e.g. "routing-system-test" from "/routing-system-test")
    const pathParts = url.pathname.replace(/^\//, '').split('/');
    const lpSlug = pathParts[0];

    // Helper: fetch a text asset from the static bundle
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

    // 1. Read routes manifest and look up lpSlug
    const manifestText = await fetchAsset('/landing-pages/_routes_manifest.json');
    if (!manifestText) {
      return new Response('Page not found', { status: 404 });
    }

    let routesManifest;
    try {
      routesManifest = JSON.parse(manifestText);
    } catch {
      return new Response('Page not found', { status: 404 });
    }

    const lpFolderId = routesManifest[lpSlug];
    if (!lpFolderId) {
      return new Response('Page not found', { status: 404 });
    }

    // 2. Read publish config for the resolved LP folder
    const publishConfigText = await fetchAsset(`/landing-pages/${lpFolderId}/_publish_config.json`);
    if (!publishConfigText) {
      return new Response('Page not found', { status: 404 });
    }

    let publishConfig;
    try {
      publishConfig = JSON.parse(publishConfigText);
    } catch {
      return new Response('Page not found', { status: 404 });
    }

    // 3. Select position (A or B) via weighted random using split values
    const positions = publishConfig.positions;
    let selectedPosition = 'A'; // safe default

    const totalSplit = Object.values(positions).reduce((sum, p) => sum + p.split, 0);
    let rand = Math.random() * totalSplit;
    for (const [posKey, posData] of Object.entries(positions)) {
      rand -= posData.split;
      if (rand <= 0) {
        selectedPosition = posKey;
        break;
      }
    }

    const selectedVariant = positions[selectedPosition];
    const variantFolder = selectedPosition === 'A' ? 'variant-a' : 'variant-b';

    // 4. Fetch the selected variant's index.html
    const variantPath = `/landing-pages/${lpFolderId}/${variantFolder}/index.html`;
    const variantHtml = await fetchAsset(variantPath);

    if (!variantHtml) {
      return new Response('Page not found', { status: 404 });
    }

    const response = new Response(variantHtml, {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });

    // 5. Build the dataLayer script to inject as first child of <head>
    const dataLayerScript = `<script>
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  lp_id: "${publishConfig.lp_id}",
  publish_ver: ${publishConfig.publish_ver},
  sku: "${publishConfig.sku}",
  position: "${selectedPosition}",
  variant_id: "${selectedVariant.variant_id}",
  variant_ver: ${selectedVariant.variant_ver}
});
</script>`;

    // Fetch global blocks
    const fetchBlock = async (blockPath) => {
      const text = await fetchAsset(blockPath);
      return text || '';
    };

    // Load manifest
    const blocksManifestText = await fetchBlock('/global-blocks/blocks-manifest.json');
    let blocksManifest = {};
    try { blocksManifest = JSON.parse(blocksManifestText); } catch {}

    const [headerHtml, footerHtml] = await Promise.all([
      fetchBlock('/global-utilities/util001-header.html'),
      fetchBlock('/global-utilities/util002-footer.html'),
    ]);

    return new HTMLRewriter()
      .on('head', {
        element(el) { el.prepend(dataLayerScript, { html: true }); }
      })
      .on('#global-header', {
        element(el) { el.replace(headerHtml, { html: true }); }
      })
      .on('#global-block', {
        async element(el) {
          const blockId = el.getAttribute('data-block');
          const blockFile = blocksManifest[blockId];
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

import type { APIRoute } from "astro";

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });

// Shared bucket ("websites-images") holds assets for multiple properties;
// keyPrefix keeps this site's objects from colliding with the other sites',
// and (if this site ever adds a video route) separates images from video
// within this site.
export function createR2ProxyRoute(keyPrefix: string): APIRoute {
  return async ({ params, locals }) => {
    const path = params.path;
    if (!path) return notFound();

    const bucket = locals.runtime.env.IMAGES_BUCKET;
    if (!bucket) return notFound();

    const object = await bucket.get(`${keyPrefix}/${path}`);
    if (!object) return notFound();

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-length", String(object.size));
    // Short browser TTL (revalidates quickly) + long edge TTL (until purged
    // explicitly by the publish-image script on upload).
    headers.set("cache-control", "public, max-age=300, s-maxage=31536000");

    return new Response(object.body, { headers });
  };
}

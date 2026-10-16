/**
 * www.elvhack.com → https://elvhack.com 的 301 跳转。
 * 路径和查询参数原样保留，只换主机名并强制 https。
 */
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = 'elvhack.com';
    url.port = '';
    return new Response(null, {
      status: 301,
      headers: {
        Location: url.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  },
};

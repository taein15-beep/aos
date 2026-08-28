const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3080;
const ADMIN_SITE_ORIGIN = process.env.ADMIN_SITE_ORIGIN || "http://127.0.0.1:3000";

const publicDirectory = path.join(__dirname, "public");

const ADMIN_SITE_PREFIXES = [
  "/members",
  "/member",
  "/products",
  "/stamp-tours",
  "/tour",
  "/api/admin",
  "/api/tour",
  "/_next",
  "/app",
  "/__vinext",
  "/favicon.svg",
];

function shouldProxyToAdminSite(urlPath) {
  return ADMIN_SITE_PREFIXES.some(
    (prefix) => urlPath === prefix || urlPath.startsWith(`${prefix}/`),
  );
}

function proxyToAdminSite(req, res) {
  const target = new URL(req.originalUrl, ADMIN_SITE_ORIGIN);

  const proxyReq = http.request(
    {
      method: req.method,
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      headers: {
        ...req.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    res
      .status(502)
      .type("text/html; charset=utf-8")
      .send(
        `<h1>admin-site dev 서버 연결 실패</h1>
<p><code>${req.originalUrl}</code> 는 Next.js admin-site 라우트입니다.</p>
<p>먼저 admin-site 개발 서버를 실행해 주세요.</p>
<pre>cd admin-site\nnpm run dev</pre>
<p>그다음 <a href="${ADMIN_SITE_ORIGIN}${req.originalUrl}">${ADMIN_SITE_ORIGIN}${req.originalUrl}</a> 로 접속하세요.</p>`,
      );
  });

  req.pipe(proxyReq);
}

app.use((req, res, next) => {
  if (shouldProxyToAdminSite(req.path)) {
    proxyToAdminSite(req, res);
    return;
  }
  next();
});

app.use(express.static(publicDirectory));

app.get("/", (req, res) => {
  res.redirect("/admin/dashboard.html");
});

app.listen(PORT, () => {
  console.log(`AOS static server: http://localhost:${PORT}`);
  console.log(`Admin-site (Next.js): ${ADMIN_SITE_ORIGIN}`);
  console.log(`웹회원관리: ${ADMIN_SITE_ORIGIN}/members/web`);
});

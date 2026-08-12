const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const publicDirectory = path.join(__dirname, "public");

// 로컬 개발환경에서 public 폴더의 정적 파일 제공
app.use(express.static(publicDirectory));

// 기본 주소 접속 시 관리자 대시보드로 이동
app.get("/", (req, res) => {
  res.redirect("/admin/dashboard.html");
});

app.listen(PORT, () => {
  console.log(`AOS server running at http://localhost:${PORT}`);
});
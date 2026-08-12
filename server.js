const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`AOS server running at http://localhost:${PORT}`);
});
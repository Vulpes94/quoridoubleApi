const express = require("express");
const cors = require("cors");
const webSocket = require("./socket");
const app = express();

// CORS 설정
app.use(cors());

app.set("port", 3000);

// 기본 라우트 설정
app.get("/", (req, res) => {
  res.send("<h1>Socket.io Server is running</h1>");
});

const server = app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기중");
});

webSocket(server, app);

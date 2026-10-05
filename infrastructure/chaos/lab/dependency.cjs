const http = require("node:http");
http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/status") {
      res.setHeader("Content-Type", "application/json");
      res.end('{"status":"ok","synthetic":true}');
    } else {
      res.writeHead(405);
      res.end();
    }
  })
  .listen(8081, "0.0.0.0");

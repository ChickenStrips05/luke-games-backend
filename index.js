const express = require("express");
const app = express();
require("express-ws")(app);
const path = require("path");
const fs = require("fs");

const clients = new Map();

app.ws("/", function (ws, req) {
  clients.set(ws, "unknown");
  ws.send("hi")
  ws.on("message", function (msg) {
    clients.set(ws, msg);
    
  });

  ws.on("close", function () {
    clients.delete(ws);
  });
});
app.use(express.json());
app.get("/", (req, res) => {
  res.send('<meta http-equiv="refresh" content="0; URL=/home" />');
});

const htmlDir = path.join(__dirname, "html");

app.post("/data", (req,res) => {
  const data = req.body

  console.log(data)
  
  switch (data.type) {
    case 'fetchClients':
      res.json({clients:clients})
    case 'closeAllClients':
      clients.forEach((_,client)=>{console.log('closed:',client);client.send(JSON.stringify({type:'closeWindow'}))})
      res.json({status:'sent close request to all clients'})
  }
  



})


// Serve a specific HTML file based on URL
app.get("/*id", (req, res) => {
  let page = req.path;
  let filePath = path.join(htmlDir, `${page}`);
  console.log(`looking in ${filePath}`);
  if (page != "/data") {
    if (path.extname(filePath)) {
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          res.sendStatus(404);
        } else {
          res.sendFile(filePath);
        }
      });
    } else {
      filePath = path.join(htmlDir, page, "/index.html");
      console.log(`looking in ${filePath}`);
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          res.sendStatus(404);
        } else {
          res.sendFile(filePath);
        }
      });
    }
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

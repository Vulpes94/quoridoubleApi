const SocketIO = require("socket.io");

module.exports = (server, app) => {
  const io = SocketIO(server, { path: "/socket.io" });

  app.set("io", io);

  const roomNamespace = io.of("/room");
  let waitingPlayer = null; // 대기 중인 첫 번째 플레이어를 저장

  roomNamespace.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    if (waitingPlayer) {
      // 대기 중인 첫 번째 플레이어가 있으면 새로운 방 생성
      const roomId = `room-${waitingPlayer.id}-${socket.id}`; // 고유 방 ID 생성
      socket.join(roomId); // 새로 연결된 플레이어를 방에 추가
      waitingPlayer.join(roomId); // 대기 중인 플레이어도 같은 방에 추가

      console.log(`Room ${roomId} created`);

      // 랜덤으로 0 또는 1을 생성하여 두 플레이어에게 전달
      const isFirst = Math.floor(Math.random() * 2);

      // 두 번째 플레이어에게 isFirst 값을 전송
      socket.emit("startGame", { roomId, isFirst });

      // 첫 번째 플레이어에게 상대방의 isFirst 값을 반전하여 전송
      waitingPlayer.emit("startGame", { roomId, isFirst: 1 - isFirst });

      // 상대방의 연결이 끊어졌을 때 처리
      const disconnectHandler = (disconnectingSocket) => {
        console.log(`User disconnected: ${disconnectingSocket.id}`);

        // 방에 남아있는 플레이어에게 알림
        roomNamespace.to(roomId).emit("opponentDisconnected", {
          message: "Your opponent has disconnected.",
        });

        // 플레이어가 나갔을 때 방에서 제거
        disconnectingSocket.leave(roomId);
      };

      // 두 플레이어에 대해 연결 끊김 이벤트 처리
      socket.on("disconnect", () => disconnectHandler(socket));
      waitingPlayer.on("disconnect", () => disconnectHandler(socket));

      // 방이 설정된 후 waitingPlayer 초기화
      waitingPlayer = null;
    } else {
      // 대기 중인 플레이어가 없으면 현재 소켓을 대기 상태로 설정
      waitingPlayer = socket;
      socket.emit("waiting", "Waiting for another player...");

      // 첫 번째 플레이어가 연결을 끊을 때 처리 (게임 시작 전)
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        waitingPlayer = null; // 대기 중인 플레이어 초기화
        socket.leaveAll(); // 방에서 나가기
      });
    }

    // gameData 이벤트 처리
    socket.on("gameData", (data) => {
      const rooms = Array.from(socket.rooms).filter(
        (room) => room !== socket.id
      ); // 소켓이 속한 방
      rooms.forEach((roomId) => {
        socket.to(roomId).emit("gameData", data); // 같은 방의 다른 클라이언트에게만 메시지 전달
      });
    });
  });
};

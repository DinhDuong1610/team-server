const { Server } = require("socket.io");

// Khởi tạo Socket.IO server
const io = new Server(9000, {
  cors: {
    origin: "*", // Cấu hình CORS cho phép tất cả các nguồn
    methods: ["GET", "POST"],
  },
});

// Map để lưu trữ userID và socketID
const userSocketMap = new Map();

// Khi client kết nối
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Lắng nghe sự kiện 'user:register' để lưu trữ userID
  socket.on("user:register", (userID) => {
    userSocketMap.set(userID, socket.id);
    console.log(`User registered: ${userID} with socket ID: ${socket.id}`);
  });

  // Lắng nghe sự kiện 'sendMessage'
  socket.on("sendMessage", (data) => {
    handleSendMessage(socket, data);
  });

  socket.on('videoCallRequest', (data) => {
    console.log('Video call request received:', data);
    const { to, room } = data;
    socket.to(to).emit('videoCallRequest', { ...data });
  });

  socket.on('videoCallResponse', (data) => {
    console.log('Video call response received:', data);
    const { to, room } = data;
    socket.to(to).emit('videoCallResponse', { ...data });
  });

  socket.on('iceCandidate', (data) => {
    const { to, room, candidate } = data;
    socket.to(to).emit('iceCandidate', { candidate });
  });

  // Khi client ngắt kết nối
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // Xóa userID khỏi map khi ngắt kết nối
    for (const [userID, socketID] of userSocketMap.entries()) {
      if (socketID === socket.id) {
        userSocketMap.delete(userID);
        console.log(`User disconnected: ${userID}`);
        break;
      }
    }
  });
});

// Xử lý khi client gửi tin nhắn
function handleSendMessage(socket, data) {
  console.log("Received message to send:", data);
  const { user_to, message, user_from } = data;

  // Gửi tin nhắn tới client đích
  const recipientSocketId = userSocketMap.get(user_to);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("sendMessage", {
      data,
    });
  } else {
    console.log(`User ${user_to} is not connected.`);
  }
}

// Xử lý khi có yêu cầu gọi video
function handleVideoCallRequest(socket, data) {
  const { to, from, signal } = data;
  const recipientSocketId = userSocketMap.get(to);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("videoCallRequest", {
      from,
      signal,
    });
  } else {
    console.log(`User ${to} is not connected for video call.`);
  }
}

// Xử lý phản hồi cuộc gọi video
function handleVideoCallResponse(socket, data) {
  const { to, from, signal } = data;
  const recipientSocketId = userSocketMap.get(to);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("videoCallResponse", {
      from,
      signal,
    });
  } else {
    console.log(`User ${to} is not connected for video call response.`);
  }
}

// Xử lý ICE candidates
function handleIceCandidate(socket, data) {
  const { to, candidate } = data;
  const recipientSocketId = userSocketMap.get(to);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit('iceCandidate', {
      candidate,
    });
  } else {
    console.log(`User ${to} is not connected for ICE candidate.`);
  }
}

console.log("Socket.IO server is running on http://localhost:9000");

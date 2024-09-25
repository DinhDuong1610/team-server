const { Server } = require('socket.io');

// Khởi tạo Socket.IO server
const io = new Server(9000, {
  cors: {
    origin: '*', 
  },
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

// Khi client kết nối
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Lắng nghe sự kiện 'room:join' để tham gia phòng
  socket.on('room:join', (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    socket.join(room);
    io.to(room).emit('user:joined', { email, id: socket.id });
    io.to(socket.id).emit('room:join', data);
  });

  // Lắng nghe sự kiện 'sendMessage'
  socket.on('sendMessage', (data) => {
    handleSendMessage(socket, data);
  });

  // Lắng nghe sự kiện 'videoCallRequest'
  socket.on('videoCallRequest', (data) => {
    console.log('Video call request received:', data);
    if (emailToSocketIdMap.has(data.to)) {
      console.log(`Sending video call request to ${data.to}`);
      io.to(emailToSocketIdMap.get(data.to)).emit('videoCallRequest', data);
    } else {
      console.log(`User ${data.to} is not connected.`);
    }
  });

  // Lắng nghe sự kiện 'videoCallResponse'
  socket.on('videoCallResponse', (data) => {
    console.log('Video call response received:', data);
    if (emailToSocketIdMap.has(data.to)) {
      io.to(emailToSocketIdMap.get(data.to)).emit('videoCallResponse', data);
    }
  });

  // Lắng nghe sự kiện 'user:call'
  socket.on('user:call', ({ to, offer }) => {
    io.to(to).emit('incomming:call', { from: socket.id, offer });
  });

  // Lắng nghe sự kiện 'call:accepted'
  socket.on('call:accepted', ({ to, ans }) => {
    io.to(to).emit('call:accepted', { from: socket.id, ans });
  });

  // Lắng nghe sự kiện 'peer:nego:needed'
  socket.on('peer:nego:needed', ({ to, offer }) => {
    console.log('peer:nego:needed', offer);
    io.to(to).emit('peer:nego:needed', { from: socket.id, offer });
  });

  // Lắng nghe sự kiện 'peer:nego:done'
  socket.on('peer:nego:done', ({ to, ans }) => {
    console.log('peer:nego:done', ans);
    io.to(to).emit('peer:nego:final', { from: socket.id, ans });
  });

  // Khi client ngắt kết nối
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Có thể thực hiện xử lý khi client ngắt kết nối, ví dụ: xóa khỏi bản đồ
    const email = socketidToEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
      socketidToEmailMap.delete(socket.id);
    }
  });
});

// Xử lý khi client gửi tin nhắn
function handleSendMessage(socket, data) {
  console.log('Received message to send:', data);
  // Gửi tin nhắn tới các client trong cùng phòng
  io.to(data.user_to).emit('sendMessage', data);
  io.to(data.user_from).emit('sendMessage', data);
}

// Xử lý khi có yêu cầu cuộc gọi video
function handleVideoCallRequest(socket, data) {
  console.log('Video call request:', data);
  // Gửi yêu cầu cuộc gọi video tới người nhận
  io.to(data.user_to).emit('videoCallRequest', data);
}

// Xử lý khi có phản hồi cuộc gọi video
function handleVideoCallResponse(socket, data) {
  console.log('Video call response:', data);
  // Gửi phản hồi cuộc gọi video tới người nhận
  io.to(data.user_to).emit('videoCallResponse', data);
}

console.log('Socket.IO server is running on http://localhost:9000');

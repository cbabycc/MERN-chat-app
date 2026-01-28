const express = require("express");
const { chats } = require("./data/data");
// 加载环境变量
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

const path = require("path");

dotenv.config();

// 连接数据库
connectDB();

const app = express();

// - 解析JSON格式的请求体 - 当客户端发送包含JSON数据的POST、PUT或PATCH请求时，这个中间件会自动解析请求体中的JSON数据
// - 将解析后的数据附加到req.body - 解析后的JSON数据会被添加到请求对象的 req.body 属性中，方便后续的路由处理器访问
// - 自动设置Content-Type - 只有当请求头的 Content-Type 为 application/json 时才会进行解析
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// - 挂载路由模块 - 将 userRoutes 路由模块挂载到主Express应用上
// - 设置基础路径 - 所有通过 userRoutes 定义的路由都会以 /api/user 为前缀
// - 路由分发 - 当请求匹配 /api/user 路径时，会将请求转发给 userRoutes 处理
app.use("/api/user", userRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/message", messageRoutes);

// --------------------deployment-------------------
const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "frontend", "build")));

  // 使用正则表达式来处理通配符路由
  app.get(/.*/, (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html")),
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------deployment-------------------

// 不是因为命名约定，而是因为 Express 中间件的执行顺序
app.use(notFound);
// app.use(errorHandler) → 被 notFound 中的 next(error) 触发
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () =>
  console.log(`Server is listening on port ${PORT}`.yellow.bold),
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // 监听 "setup" 事件，当客户端发送 "setup" 事件时，触发回调函数
  socket.on("setup", (userData) => {
    // - 将当前连接的Socket加入一个以 用户ID命名的房间
    // - 每个用户都有自己的专属房间（房间名 = 用户ID）
    // 加入房间后，服务器可以向特定用户发送消息
    socket.join(userData._id);
    // 向客户端发送 "connected" 事件，通知客户端连接成功
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.sender._id) return;

      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});

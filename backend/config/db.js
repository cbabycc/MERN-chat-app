const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 增加到10秒超时
      socketTimeoutMS: 45000, // 45秒后关闭socket
      bufferCommands: false, // 禁用mongoose缓冲
      maxPoolSize: 10, // 维护最多10个socket连接
      connectTimeoutMS: 30000, // 30秒连接超时
    });
    console.log(`MongoDB connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit();
  }
};

module.exports = connectDB;

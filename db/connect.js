/**
 * 该文件负责连接数据库
 */

const mongoose = require("mongoose");

//   mongodb://root:123456@121.40.178.172:27017/?authMechanism=DEFAULT
//  + "/" + process.env.DB_NAME
// 定义链接数据库字符串
// const dbURI = "mongodb://" + process.env.DB_ROOT + ":" + process.env.DB_PASSWORD + "@" + process.env.DB_HOST;
const dbURI = "mongodb://localhost:27017"

// 连接
mongoose
.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

// 监听
mongoose.connection.on("connected", function () {
  console.log(`coderstation 数据库已经连接...`);
});

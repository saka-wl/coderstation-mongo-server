# 基于 node:12.1 的定制镜像
FROM node:18.16.0  

# 镜像作者
LABEL maintainer="aywzcmq64@163.com"  

# 制文件到容器里指定路径
# COPY . /home/funnyService  

# 指定工作目录为，RUN/CMD 在工作目录运行
WORKDIR /root/web/coderstation  

# 指定环境变量 NODE_ENV 为 production
ENV NODE_ENV=production  

# 安装 yarn
# RUN npm install yarn -g  

# 初始化项目
# RUN yarn install    

# 声明端口
EXPOSE 3002    

# 运行 node 项目 `$ node src/app.js`
CMD [ "npm", "start" ] 
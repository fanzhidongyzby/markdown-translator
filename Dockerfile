FROM alibaba-cloud-linux-3-registry.cn-hangzhou.cr.aliyuncs.com/alinux3/alinux3:latest

# 安装路径
ARG INSTALL_ROOT=/root
ARG APP_ROOT=$INSTALL_ROOT/markdown-translator

# 环境变量
ENV TZ=Asia/Shanghai

# 安装系统软件
RUN yum install -y npm tzdata which unzip tar tree git \
    procps-ng psmisc wget iputils net-tools telnet iotop lsof sysstat && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装命令
COPY . $APP_ROOT
WORKDIR $APP_ROOT
RUN rm -rf node_modules package-lock.json && npm install && npm run build

# 暴露端口
EXPOSE 4173

# 入口点
CMD ["npm", "run", "preview"]

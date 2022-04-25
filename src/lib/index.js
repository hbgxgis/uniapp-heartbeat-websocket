console.log("uniapp heartbeat websocket");
/**
 * 具有心跳的WebSocket连接
 */
export default class HeartBeatWebSocket {
  /**
   * @description websocket 实例对象
   */
  ws = null;

  /**
   * @description websocket 连接配置项
   */
  config = {};

  /**
   * @description 心跳配置项
   */
  heartbeat = {};

  /**
   * @description websocket 打开事件函数列表
   */
  onOpenListeners = [];

  /**
   * @description websocket 消息事件函数列表
   */
  onMessageListeners = [];

  /**
   * @description websocket 错误事件函数列表
   */
  onErrorListeners = [];

  /**
   * @description websocket 关闭事件函数列表
   */
  onCloseListeners = [];

  /**
   * @description 心跳间隔默认值
   */
  INTERVAL = 50000;

  /**
   * @description 主动关闭websocket连接的flag
   */
  activeClose = false;

  /**
   * @description 心跳定时器
   */
  heartBeatInterval = null;

  /**
   * @param {{url: string, success: Function, fail: Function, complete: Function}} config
   * @param {{message: string, interval: number}} heartbeat
   */
  constructor(config, heartbeat) {
    this.heartbeat = {
      message: "heartbeat",
      interval: this.INTERVAL,
      ...heartbeat,
    };

    if (config.url.trim() === "") {
      throw new Error(`param url is not empty string`);
    }

    this.config = {
      success: () =>
        console.log(`${this.config.url.replace(/\?.*/, "")} connect success`),
      fail: () =>
        console.error(`${this.config.url.replace(/\?.*/, "")} connect fail`),
      complete: () =>
        console.info(`${this.config.url.replace(/\?.*/, "")} connect complete`),
      ...config,
    };

    this.ws = uni.connectSocket(this.config);

    // websocket 连接成功事件
    this.ws.onOpen((data) => {
      this.onOpenListeners.forEach((callback) => {
        callback(data);
      });

      // 开始心跳
      this.heartBeatInterval = setInterval(() => {
        // console.log( 	`${this.config.url.replace(/\?.*/, '')} 发送心跳: ${this.heartbeat.message}`)
        this.send(this.heartbeat.message);
      }, this.heartbeat.interval);
    });

    // websocket 关闭事件
    this.ws.onClose(() => {
      if (this.activeClose) {
        clearTimeout(this.heartBeatInterval);
        // this.heartBeatInterval
        // 主动关闭socket连接, 不会进行重连操作
        this.onCloseListeners.forEach((callback) => {
          callback();
        });
      } else {
        this.reconnection();
      }
    });

    this.ws.onMessage(({ data }) => {
      if (typeof data === "string" && data === this.heartbeat.message) {
        // console.log(`${this.config.url.replace(/\?.*/, '')} 接收心跳: ${data}`);
        return;
      }

      this.onMessageListeners.forEach((callback) => {
        callback({ data });
      });
    });

    this.ws.onError(() => {
      this.onErrorListeners.forEach((callback) => {
        callback();
      });
    });
  }

  reconnection() {
    if (this.heartBeatInterval) {
      clearInterval(this.heartBeatInterval);
    }

    this.ws = uni.connectSocket({
      ...this.config,
      fail: () => {
        this.config.fail();
        setTimeout(() => {
          console.error(`${this.config.url} reconnection fail!`);
          this.reconnection();
          console.info(`${this.config.url} reconnection...`);
        }, 3000);
      },
    });
  }

  onOpen(callback) {
    this.onOpenListeners.push(callback);
  }

  onMessage(callback) {
    this.onMessageListeners.push(callback);
  }

  onError(callback) {
    this.onErrorListeners.push(callback);
  }

  onClose(callback) {
    this.onCloseListeners.push(callback);
  }
  send(data) {
    // 如果当前为重新连接的状态，保留消息等待连接成功后进行发送
    this.ws.send({
      data,
    });
  }

  close() {
    this.activeClose = true;
    this.ws.close();
    clearInterval(this.heartBeatInterval);
  }
}

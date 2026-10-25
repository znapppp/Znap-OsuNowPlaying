class WebSocketManager {
  constructor(host) {
    this.version = '0.1.5';

    if (host) {
      this.host = host;
    }

    this.createConnection = this.createConnection.bind(this);

    /**
     * @type {{ [key: string]: WebSocket }} asd;
     */
    this.sockets = {};
  }

  createConnection(url, callback, filters) {
    let INTERVAL = '';

    const that = this;
    const counterPath = window.COUNTER_PATH || 'Znap-OsuNowPlaying';
    this.sockets[url] = new WebSocket(`ws://${this.host}${url}?l=${encodeURIComponent(counterPath)}`);

    this.sockets[url].onopen = () => {
      console.log(`[OPEN] ${url}: Connected`);

      if (INTERVAL) clearInterval(INTERVAL);
      if (Array.isArray(filters)) {
        this.sockets[url].send(`applyFilters:${JSON.stringify(filters)}`);
      }
    };

    this.sockets[url].onclose = (event) => {
      console.log(`[CLOSED] ${url}: ${event.reason}`);

      delete this.sockets[url];
      INTERVAL = setTimeout(() => {
        that.createConnection(url, callback, filters);
      }, 1000);
    };

    this.sockets[url].onerror = (event) => {
      console.log(`[ERROR] ${url}: ${event.reason}`);
    };


    this.sockets[url].onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error != null) {
          console.error(`[MESSAGE_ERROR] ${url}:`, data.error);
          return;
        };

        if (data.message != null) {
          if (data.message.error != null) {
            console.error(`[MESSAGE_ERROR] ${url}:`, data.message.error);
            return;
          }
        };

        callback(data);
      } catch (error) {
        console.log(`[MESSAGE_ERROR] ${url}: Couldn't parse incomming message`, error);
      };
    };
  };


  /**
   * Connects to gosu compatible socket api.
   * @param {(data: any) => void} callback The function to handle received messages.
   * @param {any[]} filters
   */
  api_v1(callback, filters) {
    this.createConnection(`/ws`, callback, filters);
  };


  /**
   * Connects to tosu advanced socket api.
   * @param {(data: any) => void} callback The function to handle received messages.
   * @param {any[]} filters
   */
  api_v2(callback, filters) {
    this.createConnection(`/websocket/v2`, callback, filters);
  };


  /**
   * Connects to tosu precise socket api.
   * @param {(data: any) => void} callback The function to handle received messages.
   * @param {any[]} filters
   */
  api_v2_precise(callback, filters) {
    this.createConnection(`/websocket/v2/precise`, callback, filters);
  };


  /**
   * Connects to message
   * @param {(data: { command: string, message: any }) => void} callback The function to handle received messages.
   */
  commands(callback) {
    this.createConnection(`/websocket/commands`, callback);
  };

  /**
   *
   * @param {string} name
   * @param {string|Object} payload
   */
  sendCommand(name, command, amountOfRetries = 1) {
    const that = this;


    if (!this.sockets['/websocket/commands'] || this.sockets['/websocket/commands'].readyState !== WebSocket.OPEN) {
      setTimeout(() => {
        that.sendCommand(name, command, amountOfRetries + 1);
      }, 100);

      return;
    };


    try {
      const payload = typeof command == 'object' ? JSON.stringify(command) : command;
      this.sockets['/websocket/commands'].send(`${name}:${payload}`);
    } catch (error) {
      if (amountOfRetries <= 3) {
        console.log(`[COMMAND_ERROR] Attempt ${amountOfRetries}`, error);
        setTimeout(() => {
          that.sendCommand(name, command, amountOfRetries + 1);
        }, 1000);
        return;
      };


      console.error(`[COMMAND_ERROR]`, error);
    };
  };


  close(url) {
    this.host = url;

    const array = Object.keys(this.sockets);
    for (let i = 0; i < array.length; i++) {
      const key = array[i];
      const value = this.sockets[key];

      if (!value) continue;
      value.close();
    };
  };
};


export default WebSocketManager;

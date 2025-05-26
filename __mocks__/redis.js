// __mocks__/redis.js
import RedisMock from "redis-mock";

export function createClient(options) {
  const client = RedisMock.createClient(options);

  client.connect = async () => {
    client.emit("connect");
    client.emit("ready");
  };

  client.flushAll = () =>
    new Promise((res, rej) =>
      client.flushdb((err, ok) => (err ? rej(err) : res(ok)))
    );

  client.hSet = (key, obj) =>
    new Promise((res, rej) =>
      client.hmset(key, obj, (err, reply) => (err ? rej(err) : res(reply)))
    );

  client.hGetAll = (key) =>
    new Promise((res, rej) =>
      client.hgetall(key, (err, reply) => (err ? rej(err) : res(reply)))
    );

  // ← add this:
  client.expire = (key, seconds) => new Promise((res) => res(true));

  return client;
}

export default { createClient };

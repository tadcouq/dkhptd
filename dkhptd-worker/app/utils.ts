import fs from "fs";
import amqp from "amqplib/callback_api";

/* eslint-disable no-param-reassign */
export const toBuffer = (input: string) => Buffer.from(input);
export const toJson = (input, space = 0) => JSON.stringify(input, null, space);
export const toPrettyErr = (err: Error) => ({
  name: err.name,
  message: err.message,
  stack: err.stack.split("\n"),
});
export const update = (origin, target) => {
  if (target) {
    for (const key of Object.keys(origin)) {
      const newValue = target[key];
      if (newValue !== undefined && newValue !== null) {
        origin[key] = newValue;
      }
    }
  }
  return origin;
};
export const ensureDirExists = (dir: string) => {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};
export const assertExchange = (channel: amqp.Channel, name: string, type: string, opts?: amqp.Options.AssertExchange) => channel.assertExchange(name, type, opts);
export const assertQueue = (channel: amqp.Channel, queue?: string, options?: amqp.Options.AssertQueue, callback?: (err, ok: amqp.Replies.AssertQueue) => void) => channel.assertQueue(queue, options, callback);
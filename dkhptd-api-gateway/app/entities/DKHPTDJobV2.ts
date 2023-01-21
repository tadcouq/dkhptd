import crypto from "crypto";
import { ObjectId } from "mongodb";
import { toObjectId } from "../to";
import { c } from "../cypher";
import BaseEntity from "./BaseEntity";
import { cfg, JobStatus } from "../cfg";

export default class DKHPTDJobV2 extends BaseEntity {
  ownerAccountId: ObjectId;
  username: string;
  password: string;
  classIds: string[][];
  timeToStart: number;
  status: number;
  createdAt: number;
  doingAt: number;
  iv: string;

  constructor({ _id, username, password, classIds, timeToStart, ownerAccountId, status, createdAt, doingAt, iv }: {
    _id?: ObjectId;
    username?: string;
    password?: string;
    classIds?: string[][];
    timeToStart?: number;
    ownerAccountId?: ObjectId;
    status?: number;
    createdAt?: number;
    doingAt?: number;
    iv?: string;
  }) {
    super(_id);
    this.ownerAccountId = ownerAccountId;
    this.username = username;
    this.password = password;
    this.classIds = classIds;
    this.timeToStart = timeToStart;
    this.status = status;
    this.createdAt = createdAt;
    this.doingAt = doingAt;
    this.iv = iv;
  }

  withOwnerAccountId(id: string | ObjectId) {
    this.ownerAccountId = toObjectId(id);
    return this;
  }

  toClient() {
    return this;
  }

  decrypt() {
    const dPassword = c(cfg.JOB_ENCRYPTION_KEY).d(this.password, this.iv);
    const dUsername = c(cfg.JOB_ENCRYPTION_KEY).d(this.username, this.iv);
    return new DKHPTDJobV2({
      _id: this._id,
      ownerAccountId: this.ownerAccountId,
      username: dUsername,
      password: dPassword,
      classIds: this.classIds,
      timeToStart: this.timeToStart,
      createdAt: this.createdAt,
      doingAt: this.doingAt,
      status: this.status,
    });
  }

  encrypt() {
    const iv = crypto.randomBytes(16).toString("hex");
    const ePassword = c(cfg.JOB_ENCRYPTION_KEY).e(this.password, iv);
    const eUsername = c(cfg.JOB_ENCRYPTION_KEY).e(this.username, iv);
    return new DKHPTDJobV2({
      _id: this._id,
      ownerAccountId: this.ownerAccountId,
      username: eUsername,
      password: ePassword,
      classIds: this.classIds,
      timeToStart: this.timeToStart,
      createdAt: this.createdAt,
      doingAt: this.doingAt,
      status: this.status,
      iv: iv,
    });
  }

  toRetry() {
    const output = new DKHPTDJobV2(this);
    output._id = null;
    output.status = JobStatus.READY;
    output.doingAt = null;
    output.createdAt = Date.now();
    return output;
  }
}

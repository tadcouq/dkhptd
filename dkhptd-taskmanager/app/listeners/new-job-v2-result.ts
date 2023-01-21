import crypto from "crypto";
import { ObjectId } from "mongodb";
import { jobV2Event } from "../app-event";
import { jobV2Bus } from "../bus";
import { cfg, JobStatus } from "../cfg";
import { mongoConnectionPool } from "../connections";
import { c } from "../cypher";
import DKHPTDJobV2 from "../entities/DKHPTDJobV2";
import DKHPTDJobV2Logs from "../entities/DKHPTDJobV2Logs";
import logger from "../loggers/logger";
import { toJson } from "../to";

export const setup = () => {
  jobV2Bus.on(jobV2Event.NEW_JOB_V2_RESULT, async (result) => {
    try {
      logger.info(`Received job v2 result: ${toJson(result, 2)}`);

      const jobId = new ObjectId(result.id);
      const job = await mongoConnectionPool.getClient()
        .db(cfg.DATABASE_NAME)
        .collection(DKHPTDJobV2.name)
        .findOne({ _id: jobId });

      if (!job) {
        logger.warn(`Job ${result.id} not found for job result`);
        return;
      }

      await mongoConnectionPool.getClient()
        .db(cfg.DATABASE_NAME)
        .collection(DKHPTDJobV2.name)
        .updateOne({ _id: jobId }, { $set: { status: JobStatus.DONE } });

      const newIv = crypto.randomBytes(16).toString("hex");
      const logs = new DKHPTDJobV2Logs({
        jobId,
        workerId: result.workerId,
        ownerAccountId: job.ownerAccountId,
        logs: c(cfg.JOB_ENCRYPTION_KEY).e(toJson(result.logs), newIv),
        vars: c(cfg.JOB_ENCRYPTION_KEY).e(toJson(result.vars), newIv),
        createdAt: Date.now(),
        iv: newIv,
      });

      await mongoConnectionPool.getClient()
        .db(cfg.DATABASE_NAME)
        .collection(DKHPTDJobV2Logs.name)
        .insertOne(logs);
    } catch (err) {
      logger.error(err);
    }
  });
};

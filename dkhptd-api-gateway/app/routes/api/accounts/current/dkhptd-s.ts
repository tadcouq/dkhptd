import express from "express";
import { Filter, ObjectId } from "mongodb";
import { cfg, JobStatus } from "../../../../cfg";
import { mongoConnectionPool } from "../../../../connections";
import DKHPTDJob from "../../../../entities/DKHPTDJob";
import DKHPTDJobLogs from "../../../../entities/DKHPTDJobLogs";
import ExceptionHandlerWrapper from "../../../../middlewares/ExceptionHandlerWrapper";
import RateLimit from "../../../../middlewares/RateLimit";
import { modify, PickProps, NormalizeStringProp, NormalizeArrayProp, NormalizeIntProp, SetProp } from "../../../../modifiers";
import BaseResponse from "../../../../payloads/BaseResponse";
import { resolveMongoFilter } from "../../../../merin";
import { isFalsy } from "../../../../utils";
import { isEmpty } from "lodash";
import { FaslyValueError, EmptyStringError, RequireLengthFailed, JobNotFoundError, NotAnArrayError } from "../../../../exceptions";

const router = express.Router();

router.get("/:jobId/logs", ExceptionHandlerWrapper(async (req, resp) => {
  const accountId = req.__accountId;
  const filter: Filter<DKHPTDJobLogs> = {
    ownerAccountId: new ObjectId(accountId),
    jobId: new ObjectId(req.params.jobId),
  };
  const logs = await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJobLogs.name)
    .find(filter)
    .toArray();
  const data = logs.map((x) => new DKHPTDJobLogs(x).toClient());
  resp.send(new BaseResponse().ok(data));
}));

router.get("", ExceptionHandlerWrapper(async (req, resp) => {
  const query = modify(req.query, [PickProps(["q"], { dropFalsy: true })]);
  const accountId = req.__accountId;
  const filter: Filter<DKHPTDJob> = query.q ? resolveMongoFilter(query.q.split(",")) : {};
  filter.ownerAccountId = new ObjectId(accountId);
  const jobs = await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJob.name)
    .find(filter)
    .toArray();

  const data = jobs.map((x) => new DKHPTDJob(x).toClient());
  resp.send(new BaseResponse().ok(data));
}));

router.post("", RateLimit({ windowMs: 5 * 60 * 1000, max: 1 }), ExceptionHandlerWrapper(async (req, resp) => {
  const data = req.body?.data;

  if (isFalsy(data)) throw new FaslyValueError("body.data");
  if (!Array.isArray(data)) throw new NotAnArrayError("body.data");

  const ownerAccountId = new ObjectId(req.__accountId);
  const result = [];
  const jobsToInsert = [];

  for (const entry of data) {
    try {
      const safeEntry = modify(entry, [
        PickProps(["username", "password", "classIds", "timeToStart"]),
        NormalizeStringProp("username"),
        NormalizeStringProp("password"),
        NormalizeArrayProp("classIds", "string"),
        NormalizeIntProp("timeToStart"),
        SetProp("createdAt", Date.now()),
        SetProp("status", JobStatus.READY),
        SetProp("ownerAccountId", ownerAccountId),
      ]);

      const job = new DKHPTDJob(safeEntry);

      if (isFalsy(job.username)) throw new FaslyValueError("job.username", job.username);
      if (isEmpty(job.username)) throw new EmptyStringError("job.username", job.username);
      if (job.username.length < 8) throw new RequireLengthFailed("job.username", job.username);

      if (isFalsy(job.password)) throw new FaslyValueError("job.password", job.password);
      if (isEmpty(job.password)) throw new EmptyStringError("job.password", job.password);

      if (isFalsy(job.classIds)) throw new FaslyValueError("job.classIds");
      if (job.classIds.length == 0) throw new RequireLengthFailed("job.classIds");

      if (isFalsy(job.timeToStart)) throw new FaslyValueError("job.timeToStart");

      jobsToInsert.push(job);
      result.push(new BaseResponse().ok(job));
    } catch (err) {
      if (err.__isSafeError) {
        result.push(err.toBaseResponse());
      } else {
        result.push(new BaseResponse().failed(err).msg(err.message));
      }
    }
  }

  if (jobsToInsert.length !== 0) {
    await mongoConnectionPool
      .getClient()
      .db(cfg.DATABASE_NAME)
      .collection(DKHPTDJob.name)
      .insertMany(jobsToInsert);
  }
  resp.send(new BaseResponse().ok(result));
}));

router.delete("/:jobId", ExceptionHandlerWrapper(async (req, resp) => {
  const accountId = req.__accountId;
  const filter: Filter<DKHPTDJob> = {
    _id: new ObjectId(req.params.jobId),
    ownerAccountId: new ObjectId(accountId),
  };
  await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJob.name)
    .deleteOne(filter);
  resp.send(new BaseResponse().ok(req.params.jobId));
}));

router.post("/:jobId/retry", ExceptionHandlerWrapper(async (req, resp) => {
  const accountId = req.__accountId;
  const filter: Filter<DKHPTDJob> = {
    _id: new ObjectId(req.params.jobId),
    ownerAccountId: new ObjectId(accountId),
  };

  const existedJob = await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJob.name)
    .findOne(filter);

  if (isFalsy(existedJob)) throw new JobNotFoundError(req.params.jobId);

  const newJob = new DKHPTDJob(existedJob).toRetry();
  await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJob.name)
    .insertOne(newJob);

  resp.send(new BaseResponse().ok(req.params.jobId));
}));

router.put("/:jobId/cancel", ExceptionHandlerWrapper(async (req, resp) => {
  const accountId = req.__accountId;
  const filter: Filter<DKHPTDJob> = {
    _id: new ObjectId(req.params.jobId),
    ownerAccountId: new ObjectId(accountId),
  };
  await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJob.name)
    .findOneAndUpdate(filter, { $set: { status: JobStatus.CANCELED } });
  resp.send(new BaseResponse().ok(req.params.jobId));
}));

export default router;

import express from "express";
import { ObjectId } from "mongodb";
import { cfg, JobStatus } from "app/cfg";
import { mongoConnectionPool } from "app/connections";
import { DKHPTDJob } from "app/entities";
import { EmptyStringError, FaslyValueError, MissingRequestBodyDataError, NotAnArrayError, RequireLengthFailed } from "app/exceptions";
import { ExceptionWrapper } from "app/middlewares";
import { RateLimit } from "app/middlewares";
import { modify, PickProps, NormalizeStringProp, NormalizeArrayProp, NormalizeIntProp, SetProp } from "app/modifiers";
import BaseResponse from "app/payloads/BaseResponse";
import { isEmpty, isFalsy } from "app/utils";

const router = express.Router();

router.post("/api/accounts/current/dkhptd", RateLimit({ windowMs: 5 * 60 * 1000, max: 5 }), ExceptionWrapper(async (req, resp) => {
  const data = req.body;

  if (isFalsy(data)) throw new MissingRequestBodyDataError();

  const ownerAccountId = new ObjectId(req.__accountId);
  const safeData = modify(data, [
    PickProps(["username", "password", "classIds", "timeToStart"]),
    NormalizeStringProp("username"),
    NormalizeStringProp("password"),
    NormalizeArrayProp("classIds", "string"),
    NormalizeIntProp("timeToStart"),
    SetProp("createdAt", Date.now()),
    SetProp("status", JobStatus.READY),
    SetProp("ownerAccountId", ownerAccountId),
  ]);

  const job = new DKHPTDJob(safeData);

  if (isFalsy(job.username)) throw new FaslyValueError("job.username");
  if (isEmpty(job.username)) throw new EmptyStringError("job.username");
  if (job.username.length < 8) throw new RequireLengthFailed("job.username", job.username);

  if (isFalsy(job.password)) throw new FaslyValueError("job.password");
  if (isEmpty(job.password)) throw new EmptyStringError("job.password");

  if (isFalsy(job.classIds)) throw new FaslyValueError("job.classIds");
  if (!Array.isArray(job.classIds)) throw new NotAnArrayError("job.classIds");
  if (job.classIds.length == 0) throw new RequireLengthFailed("job.classIds", job.username);

  if (isFalsy(job.timeToStart)) throw new FaslyValueError("job.timeToStart");

  await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJob.name)
    .insertOne(job);
  resp.send(new BaseResponse().ok(job));
})
);

export default router;

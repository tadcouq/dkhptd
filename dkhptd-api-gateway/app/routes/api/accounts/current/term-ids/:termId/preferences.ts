import express from "express";
import { Filter, ObjectId } from "mongodb";
import { cfg } from "app/cfg";
import { mongoConnectionPool } from "app/connections";
import { AccountPreference } from "app/entities";
import { MissingRequestBodyDataError } from "app/exceptions";
import { ExceptionWrapper } from "app/middlewares";
import BaseResponse from "app/payloads/BaseResponse";
import { modify, PickProps, NormalizeArrayProp } from "app/modifiers";
import { isFalsy } from "app/utils";

const router = express.Router();

router.get("", ExceptionWrapper(async (req, resp) => {
  const accountId = req.__accountId;
  const termId = req.__termId;

  const filter: Filter<AccountPreference> = {
    ownerAccountId: new ObjectId(accountId),
    termId: termId,
  };

  const preferences = await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(AccountPreference.name)
    .find(filter)
    .toArray();
  resp.send(new BaseResponse().ok(preferences));
}));

router.put("/:preferenceId", ExceptionWrapper(async (req, resp) => {
  const accountId = req.__accountId;
  const preferenceId = new ObjectId(req.params.preferenceId);
  const termId = req.__termId;

  const data = req.body;

  if (isFalsy(data)) throw new MissingRequestBodyDataError();

  const body = modify(data, [
    PickProps(["wantedSubjectIds"]),
    NormalizeArrayProp("wantedSubjectIds", "string"),
  ]);

  const filter: Filter<AccountPreference> = {
    _id: preferenceId,
    ownerAccountId: new ObjectId(accountId),
    termId: termId,
  };

  await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(AccountPreference.name)
    .updateOne(filter, {
      $set: {
        termId: termId,
        wantedSubjectIds: body.wantedSubjectIds,
      },
    });
  resp.send(new BaseResponse().ok());
}));

export default router;

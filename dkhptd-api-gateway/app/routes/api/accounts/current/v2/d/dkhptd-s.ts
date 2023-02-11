import express from "express";
import { Filter, ObjectId } from "mongodb";
import { cfg } from "app/cfg";
import { mongoConnectionPool } from "app/connections";
import { ExceptionWrapper } from "app/middlewares";
import { decryptJobV2 } from "app/utils";
import { modify, PickProps } from "app/modifiers";
import BaseResponse from "app/payloads/BaseResponse";
import { resolveMongoFilter } from "app/merin";
import { DKHPTDJobV2 } from "app/entities";

const router = express.Router();

router.get("/d/dkhptd-s", ExceptionWrapper(async (req, resp) => {
  const query = modify(req.query, [PickProps(["q"], { dropFalsy: true })]);
  const accountId = req.__accountId;

  const filter: Filter<DKHPTDJobV2> = query.q ? resolveMongoFilter(query.q.split(",")) : {};
  filter.ownerAccountId = new ObjectId(accountId);
  const jobs = await mongoConnectionPool
    .getClient()
    .db(cfg.DATABASE_NAME)
    .collection(DKHPTDJobV2.name)
    .find(filter)
    .toArray();
  const data = jobs.map((x) => decryptJobV2(new DKHPTDJobV2(x)));
  resp.send(new BaseResponse().ok(data));
}));

export default router;

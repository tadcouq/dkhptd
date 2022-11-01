const express = require("express");
const { ObjectId } = require("mongodb");
const BaseResponse = require("../payloads/BaseResponse");
const ExceptionHandler = require("./ExceptionHandler");
const config = require("../config");
const JwtFilter = require("../middlewares/JwtFilter");

module.exports = (db, collectionName) => {
  const router = express.Router();
  router.delete("/api/accounts/current/dkhptd-s/:jobId", JwtFilter(config.SECRET), ExceptionHandler(async (req, resp) => {
    const accountId = req.__accountId;
    const filter = { _id: new ObjectId(req.params.jobId), ownerAccountId: new ObjectId(accountId) };
    await db.collection(collectionName).deleteOne(filter);
    resp.send(new BaseResponse().ok(req.params.jobId));
  }));
  return router;
};

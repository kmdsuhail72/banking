const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {

  getTransactions,
  transferMoney

} = require("../controllers/transactionController");

router.get(
  "/",
  authMiddleware,
  getTransactions
);

router.post(
  "/transfer",
  authMiddleware,
  transferMoney
);

module.exports = router;
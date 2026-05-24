const Transaction = require("../models/Transaction");

const User = require("../models/User");

exports.getTransactions = async (req, res) => {

  try {

    const transactions = await Transaction.find({

      userId: req.user.id

    });

    res.json(transactions);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

exports.transferMoney = async (req, res) => {

  try {

    const { account, amount, description } = req.body;

    const user = await User.findById(req.user.id);

    if (user.balance < amount) {

      return res.status(400).json({
        message: "Insufficient Balance"
      });
    }

    user.balance -= amount;

    await user.save();

    const transaction = await Transaction.create({

      userId: req.user.id,

      name: description || "Money Transfer",

      amount: `- ₹${amount}`,

      type: "Debit"

    });

    res.json({

      message: "Transfer Successful",

      transaction

    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};
const User = require("../models/User");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {

  try {

    const { name, email, password } = req.body;

    /* Check Existing User */

    const existingUser = await User.findOne({ email });

    if (existingUser) {

      return res.status(400).json({

        message: "User already exists"

      });

    }

    /* Hash Password */

    const hashedPassword = await bcrypt.hash(password, 10);

    /* Create User */

    const user = await User.create({

      name,
      email,
      password: hashedPassword

    });

    /* Secure Response */

    res.status(201).json({

      _id: user._id,
      name: user.name,
      email: user.email,
      balance: user.balance

    });

  } catch (error) {

    res.status(500).json({

      message: error.message

    });

  }
};
exports.loginUser = async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {

      return res.status(400).json({
        message: "User not found"
      });

    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {

      return res.status(400).json({
        message: "Invalid Credentials"
      });

    }

    const token = jwt.sign(

      {
        id: user._id
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "1d"
      }

    );

    res.json({

      token,

      user: {

        _id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance

      }

    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};
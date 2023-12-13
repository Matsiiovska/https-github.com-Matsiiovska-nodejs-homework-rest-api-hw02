const { User } = require("../models/user");
const ctrlWrapper = require("../helpers/ctrlWrapper");
const HttpError = require("../helpers/HttpError");
const sendEmail = require("../helpers/sendEmail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { id } = require("@hapi/joi/lib/base");
const gravatar = require("gravatar");
const path = require("path");
const fs = require('fs/promises');
const Jimp = require('jimp');
const { v4: uuid } = require('uuid');

require("dotenv").config();


const { SECRET_KEY, BASE_URL } = process.env;

const avatarDir = path.join(__dirname, "../", "public", "avatars");

const payload = {
    id: "63fe4a5a68b27c947e28495b"
}


const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
console.log(token);
const decodeToken = jwt.decode(token);
console.log(decodeToken);

try {
    const { id } = jwt.verify(token, SECRET_KEY);
    console.log(id);
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzZmU0YTVhNjhiMjdjOTQ3ZTI4NDk1YiIsImlhdCI6MTcwMTE4OTg4OCwiZXhwIjoxNzAxMjcyNjg4fQ.T3k1tEd5vjo4LtaO93_kqOJTXu7uN19gI0wEHU4Ae8w";
    const result = jwt.verify(invalidToken, SECRET_KEY);
    console.log(result);
} catch (error) {
    console.log(error.message);  
}

const register = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
        throw HttpError(409, "Email in use");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const avatarURL = gravatar.url(email);

    const verificationToken = uuid();

    const newUser = await User.create({ ...req.body, password: hashPassword, avatarURL, verificationToken });
    
    const verifyEmail = {
        to: email,
        subject: "Verify email",
        html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${verificationToken}">Click verify email</a>`
    };

    await sendEmail(verifyEmail);
    
    res.status(201).json({
        email: newUser.email,
    })
}


const verifyEmail = async (req, res) => {
    const { verificationToken } = req.params;
    const user = await User.findOne({ verificationToken });
    if (!user) {
        throw HttpError(401, "Email not found");

    }
    await User.findByIdAndUpdate(user._id, { verify: true, verificationToken: "" });
    res.json({
        message: "Email verify success"
    })
}

const resendVerifyEmail = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        throw HttpError(401, "Email not found");  
    }
    if (user.verify) {
        throw HttpError(401, "Email already verify");      
    }
     const verifyEmail = {
        to: email,
        subject: "Verify email",
        html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${user.verificationToken}">Click verify email</a>`
    }
    await sendEmail(verifyEmail);
    
    res.json({
        message: "Verify email send success",
    })
}


const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        throw HttpError(401, "Email or password is wrong");
    }

    if (!user.verify) {
    throw HttpError(401, "Email not verified");

}

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
             throw HttpError(401, "Email or password is wrong");   
    }


    const payload = {
        id: user._id, 
    }
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
    await User.findByIdAndUpdate(user._id, {token})
    res.json({
        token,
    })

}

const getCurrent = async (req, res) => {
    const { email, name } = req.user;
    res.json({
        email,
        name,
    })
}

const logout = async (req, res) => {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { token: "" });
    res.json({
        message: "Logout success"
    })

}

const updateAvatar = async (req, res) => {
    const { _id } = req.user;
    const { path: tempUpload, originalname } = req.file;
    const filename = `${_id}_${originalname}`;
    const resultUpload = path.join(avatarDir, filename);
    try {
        const image = await Jimp.read(tempUpload);
        await image.resize(250, 250).write(resultUpload);
    } catch (error) {
        console.error('Error resizing avatar:', error);
        return res.status(500).json({ error: 'Error resizing avatar' });
    }
    await fs.unlink(tempUpload);
    const avatarURL = path.join("avatars", filename);
    await User.findByIdAndUpdate(_id, { avatarURL });
    res.json({
        avatarURL,
    })


}

module.exports = {
    register: ctrlWrapper(register),
    verifyEmail: ctrlWrapper(verifyEmail),
    resendVerifyEmail: ctrlWrapper(resendVerifyEmail), 
    login: ctrlWrapper(login), 
    getCurrent: ctrlWrapper(getCurrent),
    logout: ctrlWrapper(logout),
    updateAvatar: ctrlWrapper(updateAvatar),

}
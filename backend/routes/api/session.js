const express = require('express')
const { setTokenCookie, restoreUser } = require('../../utils/auth');
const { User } = require('../../db/models');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const router = express.Router();


//expect login to have email/password as key/value pairs
const validateLogin = [
    check('credential')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage('Please provide a valid email or username.'),
    check('password')
        .exists({ checkFalsy: true })
        .withMessage('Please provide a password.'),
    handleValidationErrors
];

// Log in
router.post(
    '/',
    validateLogin,
    async (req, res, next) => {
        const { credential, password } = req.body;

        const user = await User.login({ credential, password });

        if (!user) {
            // const err = new Error('Login failed');
            // err.status = 401;
            // err.title = 'Login failed';
            // err.errors = ['The provided credentials were invalid.'];
            // return next(err);
            res.status(401);
            return res.json({
                message: "Invalid credentials",
                statusCode: 401,
                // errors: "The provided credentials were invalid."
            })
        }

        const token = await setTokenCookie(res, user);
        const userJSON = user.toJSON();
        userJSON.token = token;


        return res.json(
            userJSON
        );
    }
);

// Log out
router.delete(
    '/',
    (_req, res) => {
        res.clearCookie('token');
        return res.json({ message: 'success' });
    }
);


// Restore session user
router.get(
    '/',
    // restoreUser,
    (req, res) => {
        const { user } = req;
        if (user) {
            return res.json(
                user.toSafeObject()
            );
        } else { res.json(null) };
    }
);




module.exports = router;

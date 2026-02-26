const express = require('express');
const cookieparser = require("cookie-parser");
const app = express();




app.use(express.json());
app.use(cookieparser());


/**
 * - Router required
 */
const authRouter = require("./routes/auth.route");
const accountRouter = require("./routes/account.route");


/**
 * - routes used
 */
app.use("/api/auth" , authRouter);
app.use("/api/account" , accountRouter);



module.exports = app;
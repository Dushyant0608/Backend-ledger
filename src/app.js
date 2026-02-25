const express = require('express');
const cookieparser = require("cookie-parser");
const app = express();

const authRouter = require("./routes/auth.route");

app.use(express.json());
app.use(cookieparser());

app.use("/api/auth" , authRouter);



module.exports = app;
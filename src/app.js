import express from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";


const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL,    
    credentials: true   
}));


app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


import userRouter from './router/user.router.js';
app.use("/api/v1/users", userRouter);


export default app;
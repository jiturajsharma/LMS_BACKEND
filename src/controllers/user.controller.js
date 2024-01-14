import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const generateAccessTokenAndfereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken =  user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken,  refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wring while generating refresh and access token")
    }
}

const options = {
    secure: process.env.NODE_ENV === 'production' ? true : false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    };


const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    if ([fullName, password, email].some((fields) => fields?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if a user with the same email or username already exists
    const existUser = await User.findOne({email});

    if (existUser) {
        throw new ApiError(409, "User  already exists");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    // console.log({avatarLocalPath})

    const avatar = await uploadOnCloudinary(avatarLocalPath, {
        folder: 'Registratin Photos', 
        width: 250,
        height: 250,
        gravity: 'faces',
        crop: 'fill',
    });

    // Check if avatar upload is successful
    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed");
    }
    // Create a new user in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        email,
        password,
    });

    // Retrieve the created user from the database (excluding password and refreshToken)
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Check if user creation is successful
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered successfully")
    );
});



const loginUser = asyncHandler(async(req,  res) =>{
    const {email, password} = req.body

    if(!email || !password){
        throw new ApiError(400,  "email is required to login")
    }
    
    const user = await User.findOne({email}).select("+password")

    if(!user){
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken} =  await generateAccessTokenAndfereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
        new ApiResponse(200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
            )
    )
})



export { registerUser , loginUser }
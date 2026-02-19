import express from "express";
import { signupVolunteer, signinVolunteer } from "../controllers/volunteerController.js";

const router = express.Router();

router.post("/signup", signupVolunteer);
router.post("/signin", signinVolunteer);

export default router;

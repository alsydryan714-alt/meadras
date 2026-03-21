import { Router, type IRouter, type Request, type Response } from "express";
import healthRouter from "./health";
import teachersRouter from "./teachers";
import classesRouter from "./classes";
import subjectsRouter from "./subjects";
import timetableRouter from "./timetable";
import substitutionsRouter from "./substitutions";
import examsRouter from "./exams";
import authRouter from "./auth";
import schoolsRouter from "./schools";
import paymentRouter from "./payment";
import tasksRouter from "./tasks";
import calendarRouter from "./calendar";
import scheduleSettingsRouter from "./schedule-settings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/schools", schoolsRouter);
router.use("/payment", paymentRouter);
router.use("/teachers", teachersRouter);
router.use("/classes", classesRouter);
router.use("/subjects", subjectsRouter);
router.use("/timetable", timetableRouter);
router.use("/substitutions", substitutionsRouter);
router.use("/exam-committees", examsRouter);
router.use("/tasks", tasksRouter);
router.use("/calendar", calendarRouter);
router.use("/schedule-settings", scheduleSettingsRouter);
router.use("/admin", adminRouter);

export default router;

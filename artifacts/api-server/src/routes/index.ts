import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import designsRouter from "./designs";
import designCommentsRouter from "./designComments";
import clientsRouter from "./clients";
import authRouter from "./auth";
import authPasswordRouter from "./authPassword";
import projectsRouter from "./projects";
import approvalsRouter from "./approvals";
import quotesRouter from "./quotes";

const router: IRouter = Router();

router.use(authPasswordRouter);
router.use(authRouter);
router.use(healthRouter);
router.use(eventsRouter);
router.use(designsRouter);
router.use(designCommentsRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(approvalsRouter);
router.use(quotesRouter);

export default router;

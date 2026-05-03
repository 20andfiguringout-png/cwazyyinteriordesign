import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import designsRouter from "./designs";
import designCommentsRouter from "./designComments";
import clientsRouter from "./clients";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(designsRouter);
router.use(designCommentsRouter);
router.use(clientsRouter);

export default router;

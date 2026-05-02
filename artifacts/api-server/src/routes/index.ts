import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import designsRouter from "./designs";
import designCommentsRouter from "./designComments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(designsRouter);
router.use(designCommentsRouter);

export default router;

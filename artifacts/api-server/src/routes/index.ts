import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books.routes";
import chaptersRouter from "./chapters.routes";
import adminRouter from "./admin.routes";
import socialRouter from "./social.routes";
import authRouter from "./auth.routes";
import paymentsRouter from "./payments.routes";
import gutenbergRouter from "./gutenberg.routes";
import miscRouter from "./misc.routes";
import courseRouter from "./course.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(chaptersRouter);
router.use(adminRouter);
router.use(socialRouter);
router.use(authRouter);
router.use(paymentsRouter);
router.use(gutenbergRouter);
router.use(miscRouter);
router.use(courseRouter);

export default router;

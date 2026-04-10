import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books.routes";
import chaptersRouter from "./chapters.routes";
import adminRouter from "./admin.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(chaptersRouter);
router.use(adminRouter);

export default router;

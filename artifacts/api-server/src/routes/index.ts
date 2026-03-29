import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import { requireAuth } from "./auth";
import customersRouter from "./customers";
import driversRouter from "./drivers";
import trucksRouter from "./trucks";
import citiesRouter from "./cities";
import expenseTypesRouter from "./expense-types";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use("/masters/customers", requireAuth, customersRouter);
router.use("/masters/drivers", requireAuth, driversRouter);
router.use("/masters/trucks", requireAuth, trucksRouter);
router.use("/masters/cities", requireAuth, citiesRouter);
router.use("/masters/expense-types", requireAuth, expenseTypesRouter);

export default router;

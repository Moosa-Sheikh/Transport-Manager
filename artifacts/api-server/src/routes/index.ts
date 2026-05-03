import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import { requireAuth } from "./auth";
import customersRouter from "./customers";
import driversRouter from "./drivers";
import trucksRouter from "./trucks";
import citiesRouter from "./cities";
import expenseTypesRouter from "./expense-types";
import itemsRouter from "./items";
import tripsRouter from "./trips";
import paymentsRouter from "./payments";
import cashBookRouter from "./cash-book";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import duesRouter from "./dues";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use("/masters/customers", requireAuth, customersRouter);
router.use("/masters/drivers", requireAuth, driversRouter);
router.use("/masters/trucks", requireAuth, trucksRouter);
router.use("/masters/cities", requireAuth, citiesRouter);
router.use("/masters/expense-types", requireAuth, expenseTypesRouter);
router.use("/masters/items", requireAuth, itemsRouter);

router.use("/trips", requireAuth, tripsRouter);
router.use("/payments", requireAuth, paymentsRouter);
router.use("/cash-book", requireAuth, cashBookRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/reports", requireAuth, reportsRouter);
router.use("/dues", requireAuth, duesRouter);

export default router;

const prisma = require("../lib/prisma");
const reportService = require("../services/report.service");

async function getWidgets(req, res, next) {
  try {
    const userId = req.user.id;
    const widgets = await prisma.dashboardWidget.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
    const withData = await Promise.all(
      widgets.map(async (w) => {
        let chartData = null;
        let error = null;
        try {
          const result = await reportService.runReport(w.reportName, JSON.parse(w.reportParams || "{}"));
          chartData = reportService.toChartConfig(w.reportName, result, w.chartType);
          if (chartData) chartData.title = w.title;
        } catch (e) {
          error = e.message;
        }
        return {
          id: w.id,
          title: w.title,
          reportName: w.reportName,
          reportParams: w.reportParams,
          chartType: w.chartType,
          size: w.size || "medium",
          sortOrder: w.sortOrder,
          chartData,
          error,
        };
      })
    );
    return res.json({ widgets: withData });
  } catch (err) {
    next(err);
  }
}

async function createWidget(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, reportName, reportParams, chartType, size } = req.body;
    if (!title || !reportName) {
      return res.status(400).json({ message: "title and reportName are required" });
    }
    const paramsStr = typeof reportParams === "string" ? reportParams : JSON.stringify(reportParams || {});
    const sortOrder = await prisma.dashboardWidget.count({ where: { userId } });
    const validSize = ["small", "medium", "large"].includes(size) ? size : "medium";
    const widget = await prisma.dashboardWidget.create({
      data: {
        userId,
        title,
        reportName,
        reportParams: paramsStr,
        chartType: chartType || "bar",
        size: validSize,
        sortOrder,
      },
    });
    return res.status(201).json(widget);
  } catch (err) {
    next(err);
  }
}

async function deleteWidget(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    await prisma.dashboardWidget.deleteMany({
      where: { id, userId },
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function reorderWidgets(req, res, next) {
  try {
    const userId = req.user.id;
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: "order array is required" });
    }
    const ids = order.map((id) => Number(id));
    const widgets = await prisma.dashboardWidget.findMany({
      where: { id: { in: ids }, userId },
    });
    if (widgets.length !== ids.length) {
      return res.status(400).json({ message: "Invalid widget ids" });
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.dashboardWidget.updateMany({
          where: { id, userId },
          data: { sortOrder: index },
        })
      )
    );
    return res.status(200).json({ message: "Reordered" });
  } catch (err) {
    next(err);
  }
}

async function updateWidget(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const { size } = req.body;
    if (!["small", "medium", "large"].includes(size)) {
      return res.status(400).json({ message: "size must be small, medium, or large" });
    }
    const [updated] = await prisma.dashboardWidget.updateMany({
      where: { id, userId },
      data: { size },
    });
    if (updated === 0) return res.status(404).json({ message: "Widget not found" });
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWidgets,
  createWidget,
  deleteWidget,
  reorderWidgets,
  updateWidget,
};

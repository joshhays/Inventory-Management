const inventoryLogService = require("../services/inventoryLog.service");

const getLogs = async (req, res, next) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      inventoryLogService.findMany({ search, action, limit: limitNum, offset }),
      inventoryLogService.count({ search, action }),
    ]);

    res.status(200).json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

const getActions = async (_req, res, next) => {
  try {
    const actions = await inventoryLogService.getActions();
    res.status(200).json(actions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLogs,
  getActions,
};

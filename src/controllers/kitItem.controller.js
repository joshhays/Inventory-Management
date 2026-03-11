const kitItemService = require("../services/kitItem.service");

const getKitItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await kitItemService.getKitItems(id);
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

const addKitItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }
    const item = await kitItemService.addKitItem(id, { productId, quantity });
    if (!item) {
      return res.status(404).json({ message: "Kit not found." });
    }
    res.status(201).json(item);
  } catch (error) {
    if (error.message?.includes("not a kit") || error.message?.includes("cannot contain")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

const updateKitItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;
    const item = await kitItemService.updateKitItem(id, itemId, { quantity });
    if (!item) {
      return res.status(404).json({ message: "Kit item not found." });
    }
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
};

const removeKitItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const result = await kitItemService.removeKitItem(id, itemId);
    if (!result) {
      return res.status(404).json({ message: "Kit item not found." });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKitItems,
  addKitItem,
  updateKitItem,
  removeKitItem,
};

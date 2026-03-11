const productFileService = require("../services/productFile.service");

const getFiles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = await productFileService.getByProductId(id);
    res.status(200).json(files);
  } catch (error) {
    next(error);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const productFile = await productFileService.add(id, file);
    if (!productFile) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.status(201).json(productFile);
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await productFileService.remove(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }
    res.status(200).json({ message: "File deleted.", file });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFiles,
  uploadFile,
  deleteFile,
};

// src/socketHub.js
let ioInstance = null;
exports.setIO = (io) => { ioInstance = io; };
exports.getIO = () => ioInstance;

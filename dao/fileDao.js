

// 引入模型
const fileModel = require("../models/fileModel");

/**
 * 添加新的文件
 */
module.exports.addNewFile = async function (newFileInfo) {
    let resp = await fileModel.findOne({ fileId: newFileInfo.fileId, ownUserId: newFileInfo.ownUserId })
    if (resp) {
        return {
            code: 1,
            msg: "文件已存在",
            data: null
        }
    }
    await fileModel.create(newFileInfo)
    return {
        code: 0,
        msg: '',
        data: null
    }
};

module.exports.getAllFilesByCondition = async function (condition) {
    return await fileModel.find(condition)
}

module.exports.getAllFilesByPage = async function (page, limit, condition) {
    if (!condition.fileName && !condition.ownUserId && !condition.fileId) {
        const total = await fileModel.countDocuments()
        const data = await fileModel.find().skip((page - 1) * limit).limit(limit)
        return {
            total,
            data
        }
    } else {
        const total = await fileModel.countDocuments(condition)
        const data = await fileModel.find(condition).skip((page - 1) * limit).limit(limit)
        return {
            total,
            data
        }
    }
}

module.exports.findFile = async function (fileId, pwd) {
    return await fileModel.findOne({ _id: fileId, pwd })
}

module.exports.changeFileInfo = async function (_id, fileInfo) {
    return await fileModel.updateOne({ _id }, fileInfo)
}

module.exports.deleteFileById = async function (_id) {
    return await fileModel.updateOne({ _id }, {
        status: 0
    })
}

module.exports.forgetFile = async function (_id) {
    return await fileModel.deleteOne({ _id })
}

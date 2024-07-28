const path = require('path')

const fileTmpRecord = require("./fileTmpRecord")
const { getFileInfo, deleteChunkTemp } = require('./file')

/**
 * 删除太久未上传的文件
 */
setInterval(async () => {
    let deletedFileTempIds = []
    let deletedChunkIds = []
    for (let key of fileTmpRecord.keys()) {
        if (+fileTmpRecord.get(key) + +process.env.FILE_TEMP_DELETE_TIME < Date.now()) {
            const info = await getFileInfo(key)
            fileTmpRecord.clear(key)
            if (!info || !info.id || !info.chunkIds) {
                continue
            }
            deletedFileTempIds.push(info.id)
            deletedChunkIds.push(...info.chunkIds)
        }
    }
    await deleteChunkTemp(deletedFileTempIds, deletedChunkIds)
    console.log("delete File Chunks : " + deletedFileTempIds)
}, process.env.FILE_TEMP_DELETE_INTERVAL)
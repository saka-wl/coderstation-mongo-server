
const url=require('url')
const { analysisToken } = require('../utils/tools')

const needAuthPath = [
    "/api/uploadfile/getAllUserFiles",
    "/api/uploadfile/addNewFileInfo",
    "/api/uploadfile/deleteFile",
    "/api/uploadfile/changeFileInfo",
    "/api/uploadfile",
    "/api/uploadfile/handshake",
    "/api/uploadfile/normalUpload",
    "/api/uploadfile/forgetFile"
]

module.exports = (req, res, next) => {
    let curPath = url.parse(req.url).pathname
    if (needAuthPath.includes(curPath)) {
        if (!req.headers.authorization) {
            res.send({
                code: 1,
                msg: '未登录',
                data: null
            })
            return
        }
        const resp = analysisToken(req.headers.authorization)
        if(!resp._id || !resp.loginId) {
            res.send({
                code: 1,
                msg: '未登录',
                data: null
            })
            return
        }
    }
    next()
}
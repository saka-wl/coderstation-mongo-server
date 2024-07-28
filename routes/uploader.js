const express = require('express');
const router = express.Router();
const file = require('../utils/file');
const path = require('path');
const config = {
  fieldName: 'file',
  port: 3002,
};
const multer = require('multer');
const { addNewFile, findFile, changeFileInfo, deleteFileById, getAllFilesByCondition, forgetFile, getAllFilesByPage } = require('../dao/fileDao');
const storage = multer.memoryStorage();

const upload = multer({
  storage,
}).single(config.fieldName);

const uploadPic = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.resolve(__dirname, '../files/previewImgs')); // 指定存储的目录  
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname); // 生成唯一文件名  
    }
  })
}).array("imgs")

router.post('/previewImgs', uploadPic, async (req, res) => {
  res.send({
    code: 200,
    data: "",
    msg: '111'
  })
})

/**
 * 在数据库中添加状态
 */
router.post("/addNewFileInfo", async (req, res) => {
  const resp = await addNewFile({
    fileName: req.body.fileName,
    pwd: req.body.secret,
    ownUserId: req.body.userId,
    previewImagesUrl: req.body.previewImagesUrl || "",
    status: 1,
    fileId: req.body.fileId
  })
  res.send(resp)
})

router.post("/getAllUserFiles", async (req, res) => {
  let resp = await getAllFilesByCondition(
    {
      ownUserId: req.body.userId,
      ...req.body.condition
    }
  )
  res.send({
    code: 0,
    msg: '',
    data: resp
  })
})

router.post("/getAllUserFilesByPage", async (req, res) => {
  const resp = await getAllFilesByPage(req.body.page, req.body.limit, req.body.condition)
  res.send({
    code: 0,
    msg: '',
    data: resp
  })
})

router.post("/deleteFile", async (req, res) => {
  await deleteFileById(req.body._id)
  res.send({
    code: 0,
    msg: '',
    data: null
  })
})

router.post("/changeFileInfo", async (req, res) => {
  await changeFileInfo(req.body._id, req.body.fileInfo)
  res.send({
    code: 0,
    msg: '',
    data: null
  })
})

router.post("/getFileUrl", async (req, res) => {
  try {
    let resp = await findFile(req.body.fileId, req.body.pwd)
    let extName = resp.fileName.substr(resp.fileName.lastIndexOf('.'), resp.fileName.length)
    let size = await file.getFileSize(path.join(__dirname, "../files/file/" + resp.fileId + extName))
    let url = `${req.protocol}://${req.hostname}:${config.port}/download/${resp.fileId}${extName}`
    res.send({
      code: 0,
      msg: '',
      data: {
        url,
        size,
        imageUrls: resp.previewImagesUrl
      }
    })
  } catch (err) {
    console.log(err)
    res.send({
      code: 0,
      msg: '',
      data: null
    });
  }
})

router.get('/getFileSize', async (req, res) => {
  try {
    let size = await file.getFileSize(path.resolve(__dirname, '..') + '/files/file/' + req.query.filename)
    res.send({
      code: 0,
      msg: '',
      size
    });
  } catch (err) {
    res.send({
      code: 0,
      msg: '',
      size: null
    });
  }
})

/**
 * 上传文件路由
 */
router.post('/', upload, async (req, res) => {
  if (!req.body.chunkId) {
    res.send({
      code: 403,
      msg: '请携带分片编号',
      data: null,
    });
    return;
  }
  if (!req.body.fileId) {
    res.send({
      code: 403,
      msg: '请携带文件编号',
      data: null,
    });
    return;
  }
  try {
    const needs = await file.handleChunk(
      req.body.chunkId,
      req.body.fileId,
      req.file.buffer
    );

    res.send({
      code: 0,
      msg: '',
      data: needs,
    });
  } catch (err) {
    res.send({
      code: 403,
      msg: err.message,
      data: null,
    });
  }
});

router.post('/handshake', async (req, res) => {
  if (!req.body.fileId) {
    res.send({
      code: 403,
      msg: '请携带文件编号',
      data: null,
    });
    return;
  }
  if (!req.body.ext) {
    res.send({
      code: 403,
      msg: '请携带文件后缀，例如 .mp4',
      data: null,
    });
    return;
  }
  if (!req.body.chunkIds) {
    res.send({
      code: 403,
      msg: '请按顺序设置文件的分片编号数组',
      data: null,
    });
    return;
  }
  const result = await file.getFileInfo(req.body.fileId, req.body.ext);
  if (result === true) {
    // 不用上传了
    const size = await file.getFileSize(path.resolve(__dirname, '..') + '/files/file/' + req.body.fileId + req.body.ext)
    res.send({
      code: 0,
      msg: '',
      size,
      data: `${req.protocol}://${req.hostname}:${config.port}/download/${req.body.fileId}${req.body.ext}`
    });
    return;
  }

  if (result) {
    // 已经有文件了
    res.send({
      code: 0,
      msg: '',
      data: result.needs,
    });
    return;
  }

  const info = await file.createFileInfo(
    req.body.fileId,
    req.body.ext,
    req.body.chunkIds
  );
  res.send({
    code: 0,
    msg: '',
    data: info.needs,
  });
  return;
});

router.post('/checkFile', async (req, res) => {
  const result = await file.getFileInfo(req.body.fileId, req.body.ext, 'normal')
  const size = await file.getFileSize(path.resolve(__dirname, '..') + '/files/file/' + req.body.fileId + req.body.ext)
  if (result === true && size !== null) {
    res.send({
      code: 0,
      msg: '',
      data: `${req.protocol}://${req.hostname}:${config.port}/download/${req.body.fileId}${req.body.ext}`,
      size
    });
    return;
  } else {
    res.send({
      code: 0,
      msg: '',
      data: null
    })
  }
})

router.post("/normalUpload", upload, async (req, res) => {
  if (!req.body.userId) {
    res.send({
      code: 403,
      msg: '请携带用户编号',
      data: null,
    });
    return;
  }
  if (!req.body.fileId) {
    res.send({
      code: 403,
      msg: '请携带文件编号',
      data: null,
    });
    return;
  }
  if (!req.file.buffer) {
    res.send({
      code: 403,
      msg: '请携带文件',
      data: null,
    });
    return;
  }
  if (!req.body.fileName) {
    res.send({
      code: 403,
      msg: '请携带文件名',
      data: null,
    });
    return;
  }
  if (!req.body.ext) {
    res.send({
      code: 403,
      msg: '请携带文件后缀',
      data: null,
    });
    return;
  }
  // console.log(req.body.fileName, req.body.userId, req.body.secret, req.body.ext)
  try {
    await file.saveFileNormal(req.body.fileId, req.file.buffer, req.body.ext)
    const resp = await addNewFile({
      fileName: req.body.fileName,
      pwd: req.body.secret,
      ownUserId: req.body.userId,
      // filePosition,
      previewImagesUrl: req.body.previewImgsUrl || "",
      status: 1,
      fileId: req.body.fileId
    })
    if (resp.code !== 0) {
      res.send(resp)
    } else {
      res.send({
        code: 0,
        msg: '',
        data: `${req.protocol}://${req.hostname}:${config.port}/download/${req.body.fileId}${req.body.ext}`
      })
    }
  } catch (err) {
    console.log("Normal Upload Failed!!!" + err)
    res.send({
      code: 403,
      msg: "上传失败",
      data: null,
    });
  }

})

router.post("/forgetFile", async (req, res) => {
  // 1. 删除物理文件
  await file.deleteFile(req.body.fileId + req.body.ext)
  // 2. 删除数据库记录数据
  await forgetFile(req.body._id)
  res.send({
    code: 0,
    msg: '',
    data: null
  })
})

module.exports = router;

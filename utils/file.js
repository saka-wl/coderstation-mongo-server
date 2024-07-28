const fs = require('fs');
const path = require('path');
const fileTmpRecord = require('./fileTmpRecord');
const { exec } = require('child_process');
/**
 * 分片文件上传的存储路径
 */
const chunkDir = path.join(__dirname, '../files/chunktemp');
/**
 * 文件上传状况 文件路径
 */
const fileInfoDir = path.join(__dirname, '../files/filetemp');
/**
 * 完成上传的文件存储路径
 */
const fileDir = path.join(__dirname, '../files/file');

/**
 * 异步查看文件是否存在
 * @param {*} path 
 * @returns 
 */
async function exists(path) {
  try {
    await fs.promises.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 同步查看文件是否存在
 * @param {*} path 
 * @returns 
 */
function existsSync(path) {
  try {
    fs.statSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建存放文件，文件切片，文件信息的文件夹
 */
function createDir() {
  function _createDir(path) {
    if (!existsSync(path)) {
      fs.mkdirSync(path);
    }
  }
  _createDir(chunkDir);
  _createDir(fileInfoDir);
  _createDir(fileDir);
}

createDir();

/**
 * 
 * @param {*} id 分片id
 * @param {*} buffer 分片文件buffer编码
 * @returns 
 */
async function createFileChunk(id, buffer) {
  const absPath = path.join(chunkDir, id);
  if (!(await exists(absPath))) {
    await fs.promises.writeFile(absPath, buffer); // 写入文件
  }
  return {
    id,
    filename: id,
    path: absPath,
  };
}

exports.getFileSize = async function getFileSize(path) {
  try {
    const stat = await fs.promises.stat(path)
    return stat.size
  } catch (err) {
    return null
  }

}

/**
 * 写入json文件
 * @param {*} id 
 * @param {*} ext 
 * @param {*} chunkIds 
 * @param {*} needs 
 * @returns 
 */
async function writeFileInfo(id, ext, chunkIds, needs = chunkIds) {
  const absPath = path.join(fileInfoDir, id);
  let info = {
    id,
    ext,
    chunkIds,
    needs
  };
  await fs.promises.writeFile(absPath, JSON.stringify(info), 'utf-8');
  fileTmpRecord.set(id, Date.now())
  return info;
}

// async function writeFileInfo(id, ext, chunkIds, needs = chunkIds) {
//   const absPath = path.join(fileInfoDir, id);
//   let info = {
//     id,
//     ext,
//     chunkIds,
//     needs,
//   };
//   await fs.promises.writeFile(absPath, JSON.stringify(info), 'utf-8');
//   return info;
// }

/**
 * 存在则返回该文件的文件状况
 * 不存在则返回null
 * @param {*} id 总文件id
 * @returns 
 */
async function getFileInfo(id) {
  // 该文件上传状况的文件路径
  const absPath = path.join(fileInfoDir, id);
  if (!(await exists(absPath))) {
    return null;
  }
  const json = await fs.promises.readFile(absPath, 'utf-8');
  return JSON.parse(json);
}

exports.deleteChunkTemp = async function (tempIds, chunksIds) {
  try {
    for (const item of tempIds) {
      await fs.promises.rm(path.join(fileInfoDir, item))
    }
    for (const item of chunksIds) {
      await fs.promises.rm(path.join(chunkDir, item))
    }
  } catch (err) {
    console.log(err)
  }
}

/**
 * 更新文件信息
 * @param {*} chunkId 分片id
 * @param {*} fileId 总文件id
 * @returns 
 */
async function addChunkToFileInfo(chunkId, fileId) {
  const fileInfo = await getFileInfo(fileId);
  if (!fileInfo) {
    return null;
  }
  fileInfo.needs = fileInfo.needs.filter((it) => it !== chunkId);
  return await writeFileInfo(
    fileId,
    fileInfo.ext,
    fileInfo.chunkIds,
    fileInfo.needs
  );
}

function delay(dur) {
  return new Promise((res) => {
    setTimeout(() => {
      res(1)
    }, dur)
  })
}

/**
 * 合并文件
 * @param {*} fileInfo 文件信息
 */
async function combine(fileInfo) {
  //1. 将该文件的所有分片依次合并
  const target = path.join(fileDir, fileInfo.id) + fileInfo.ext;

  async function _move(chunkId) {
    const chunkPath = path.join(chunkDir, chunkId);
    // 获取分片信息
    const buffer = await fs.promises.readFile(chunkPath);
    await fs.promises.appendFile(target, buffer);
    fs.promises.rm(chunkPath);
  }
  for (const chunkId of fileInfo.chunkIds) {
    await _move(chunkId);
  }

  //2. 删除文件信息
  fs.promises.rm(path.join(fileInfoDir, fileInfo.id));
  // 修改视频格式
  const target2 = path.join(fileDir, 'ffmpeg-' + fileInfo.id,) + fileInfo.ext;
  transform(target, target2)
}

function transform(sourceFile, outputStream) {
  exec(`mp4fragment ${sourceFile} ${outputStream}`)
}

exports.deleteFile = async function (filePosition) {
  try {
    const absPath = path.join(fileDir, filePosition)
    await fs.promises.rm(absPath)
  } catch (err) {
    console.log(err)
  }
}

/**
 * 普通的保存文件
 * @param {*} fileId 
 * @param {*} buffer 
 * @param {*} extName 
 */
exports.saveFileNormal = async function (fileId, buffer, extName) {
  const absPath = path.join(fileDir, fileId) + extName;
  await fs.promises.writeFile(absPath, buffer);
  return absPath
}

/**
 * return:
 * null: 没有此文件，也没有文件信息
 * true: 有此文件，无须重新上传
 * object：没有此文件，但有该文件的信息
 * 
 * 文件存在则返回true
 * 
 * type == normal时，返回true（文件已存在）或者false（文件不存在）
 * 
 * type == super时，返回true或者文件信息（filetemp）或者null（文件完全不存在）
 */
exports.getFileInfo = async function (id, ext, type = 'super') {
  const absPath = path.join(fileDir, id) + ext;
  if (await exists(absPath)) {
    return true;
  }
  if (type === 'super') {
    return await getFileInfo(id);
  } else {
    return false
  }

};

exports.createFileInfo = async function (id, ext, chunkIds) {
  return await writeFileInfo(id, ext, chunkIds);
};

/**
 * 
 * @param {*} chunkId 分片id
 * @param {*} fileId 总文件id
 * @param {*} chunkBuffer 文件Buffer编码 
 * @returns 
 */
exports.handleChunk = async function (chunkId, fileId, chunkBuffer) {
  let fileInfo = await getFileInfo(fileId);
  if (!fileInfo) {
    throw new Error('请先提交文件分片信息');
  }
  if (!fileInfo.chunkIds.includes(chunkId)) {
    throw new Error('该文件没有此分片信息');
  }
  if (!fileInfo.needs.includes(chunkId)) {
    // 此分片已经上传
    return fileInfo.needs;
  }
  // 处理分片
  // 创建该分片的文件
  await createFileChunk(chunkId, chunkBuffer);
  // 添加分片信息到文件信息
  fileInfo = await addChunkToFileInfo(chunkId, fileId);
  // 还有需要的分片吗？
  if (fileInfo.needs.length > 0) {
    return fileInfo.needs;
  } else {
    // 全部传完了
    await combine(fileInfo);
    return [];
  }
};

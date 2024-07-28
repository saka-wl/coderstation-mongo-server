const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

router.get("/:filename", (req, res) => {
    const filename = path.resolve(__dirname, '..') + '/files/file/' + req.params.filename
    const extName = path.extname(filename);
    if (extName === '.mp4') {
        const stat = fs.statSync(filename)
        const range = req.headers.range
        if (!range) {
            // console.log(123456)
            res.download(filename, req.params.filename);
            return
        }
        const parts = range.replace(/bytes=/, '').split('-')
        const start = Number(parts[0])
        const end = Number(parts[1]) || stat.size - 1
        // console.log(start, end)
        const headers = {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
            "Content-Type": "video/mp4",
        };
        res.writeHead(206, headers)

        fs.createReadStream(filename, {
            start,
            end
        }).pipe(res)
    } else {
        res.download(filename, req.params.filename);
    }
})


module.exports = router;
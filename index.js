//
const express = require('express')
const compression = require('compression');
const fileUpload = require('express-fileupload');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const app = express()
const port = 3000

app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');
app.use('/css', express.static('src/public/css'))
app.use('/js', express.static('src/public/js'))
app.use(compression());
app.use(fileUpload());

const defaults = {
    resize: {
        width: 640,
        height: 360,
        fit: sharp.fit.cover,
        position: 'centre',
        background: 'black',
        kernel: 'lanczos3',
        withoutEnlargement: false,
        fastShrinkOnLoad: true
    },
    jpg: {
        quality: 80,                // Number quality, integer 1-100 (optional, default 80)
        progressive: false,         // Boolean use progressive (interlace) scan (optional, default false)
        chromaSubsampling: '4:2:0', // String set to '4:4:4' to prevent chroma subsampling when quality <= 90 (optional, default '4:2:0')
        trellisQuantisation: false, // Boolean apply trellis quantisation, requires mozjpeg (optional, default false)
        overshootDeringing: false,  // Boolean apply overshoot deringing, requires mozjpeg (optional, default false)
        optimizeScans: false,       // Boolean optimise progressive scans, forces progressive, requires mozjpeg (optional, default false)
        optimizeCoding: true,       // Boolean optimise Huffman coding tables (optional, default true)
        quantizationTable: 0,       // Number quantization table to use, integer 0-8, requires mozjpeg (optional, default 0)
        force: true                 // Boolean force JPEG output, otherwise attempt to use input format (optional, default true)
    }
}

const limits = {
    resize: {
        width: 1330,
        height: 1000
    }
}

const getMemUsage = () => {
    return (Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100)
}

const crypto = require('crypto');
var hash = function (algo, data) {
    return crypto.createHash(algo).update(data).digest();
};

app.get('/', (req, res) => {
    res.render('pages/index', {
        defaults: defaults,
        limits: limits
    });
})

app.post('/upload', function (req, res, next) {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('No files were uploaded.');
    }

    try {
        req.body.meta = JSON.parse(req.body.meta)
    } catch (e) {
        return res.json({
            status: false,
            error: 'Invalid metadata'
        });
    }

    if (!req.body.meta.name) {
        return res.json({
            status: false,
            error: 'Invalid or missing file name'
        });
    }

    // this is not secure, just store as-is

    var stream = fs.createWriteStream("src/images/" + req.body.meta.name.split('.').slice(0, -1).join('.') + '.jpg');
    var newImageName = req.body.meta.name.split('.').slice(0, -1).join('.') + '.jpg';
    stream.once('open', async function (fd) {
        stream.write(req.files.file.data);
        const key = hash('sha256', newImageName).toString('hex')

        // add to cache
        images[key] = {
            name: newImageName
        };

        // filesize
        let { size, mtime } = fs.statSync('src/images/' + images[key].name)
        images[key].size = size
        images[key].mtime = mtime

        // metadata
        const sharpImage = sharp('src/images/' + images[key].name);
        let imageMetadata = await sharpImage.metadata()
        delete imageMetadata.exif
        delete imageMetadata.iptc
        delete imageMetadata.xmp
        images[key].metadata = imageMetadata

        stream.end();
    });

    res.json({ status: true });
});

var imageStore = {}

app.get('/images/:imageName', async (req, res) => {
    let options = JSON.parse(JSON.stringify(defaults))

    let form = req.query || {}

    // resize
    if (form.resize) {
        //
        form.resize.width = parseInt(form.resize.width, 10) || options.resize.width
        options.resize.width = form.resize.width && form.resize.width >= 1 && form.resize.width <= limits.resize.width ? form.resize.width : options.resize.width

        //
        form.resize.height = parseInt(form.resize.height, 10) || options.resize.height
        options.resize.height = form.resize.height && form.resize.height >= 1 && form.resize.height <= limits.resize.height ? form.resize.height : options.resize.height

        //
        if (form.resize.autoWidth == 'true' || form.resize.autoHeight == 'true') {
            if (form.resize.autoWidth == 'true') {
                delete options.resize.height
            }
            if (form.resize.autoHeight == 'true') {
                delete options.resize.width
            }
        }

        //
        options.resize.position = form.resize.position ? form.resize.position : 'centre'

        //
        options.resize.background = form.resize.background ? form.resize.background : { r: 0, g: 0, b: 0, alpha: 1 }
        if (typeof options.resize.background === 'string' && options.resize.background === 'transparent') {
            options.resize.background = { r: 0, g: 0, b: 0, alpha: 0 }
        }

        // 
        options.resize.fit = form.resize.fit ? form.resize.fit : options.resize.fit
        if (options.resize.fit === 'none') {
            delete options.resize.fit
            delete options.resize.position
            delete options.resize.background
        }

        //
        options.resize.kernel = form.resize.kernel ? form.resize.kernel : options.resize.kernel

        //
        options.resize.withoutEnlargement = (form.resize.withoutEnlargement == 'true')

        //
        options.resize.fastShrinkOnLoad = (form.resize.fastShrinkOnLoad == 'true')
    }

    // jpg
    if (form.jpg) {
        //
        form.jpg.quality = parseInt(form.jpg.quality, 10)
        options.jpg.quality = form.jpg.quality && form.jpg.quality >= 1 && form.jpg.quality <= 100 ? form.jpg.quality : options.jpg.quality
        //
        options.jpg.progressive = (form.jpg.progressive == 'true')
        options.jpg.chromaSubsampling = form.jpg.chromaSubsampling === '4:4:4' ? '4:4:4' : '4:2:0'
        options.jpg.trellisQuantisation = (form.jpg.trellisQuantisation == 'true')
        options.jpg.overshootDeringing = (form.jpg.overshootDeringing == 'true')
        options.jpg.optimizeScans = (form.jpg.optimizeScans == 'true')
        options.jpg.optimizeCoding = (form.jpg.optimizeCoding == 'true')
        options.jpg.quantizationTable = parseInt(form.jpg.quantizationTable, 10)
        options.jpg.quantizationTable = form.jpg.quantizationTable && form.jpg.quantizationTable >= 0 && form.jpg.quality <= 8 ? form.jpg.quantizationTable : options.jpg.quantizationTable
    }

    const imagePath = path.join('src/images/', path.basename(req.params.imageName));

    // check for cached version
    const imageStoreKey = hash('sha256', JSON.stringify({ a: imagePath, b: form })).toString('hex')
    if (imageStore[imageStoreKey]) {
        console.log('Using cached image: ' + path.basename(req.params.imageName))
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        const metadata = await sharp(imageStore[imageStoreKey]).metadata();
        delete metadata.exif
        delete metadata.iptc
        delete metadata.icc
        delete metadata.xmp
        res.header('Metadata', JSON.stringify({
            "processing": false,
            "name": req.params.imageName,
            "mtime": new Date(),
            "size": imageStore[imageStoreKey].byteLength,
            "metadata": metadata
        }));
        res.header('Content-Type', 'image/jpeg').send(imageStore[imageStoreKey]);
        return
    }

    if (imagePath.split('.').pop() === 'jpg' && fs.existsSync(imagePath)) {
        const sharpImage = sharp(imagePath);
        sharpImage
            .metadata()
            .then(function (metadata) {
                return sharpImage
                    .resize(options.resize)
                    .jpeg(options.jpg)
                    .toBuffer(async function (err, data) {
                        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
                        res.header('Expires', '-1');
                        res.header('Pragma', 'no-cache');

                        const metadata = await sharp(data).metadata();
                        delete metadata.exif
                        delete metadata.iptc
                        delete metadata.icc
                        delete metadata.xmp
                        res.header('Metadata', JSON.stringify({
                            "processing": false,
                            "name": req.params.imageName,
                            "mtime": new Date(),
                            "size": data.byteLength,
                            "metadata": metadata
                        }));

                        if (err) {
                            console.log(err)
                            res.status(500).send(err.message);
                        } else {
                            console.log('Image resized: ' + path.basename(req.params.imageName))
                            //console.log(options)
                            console.log('Memory usage: ' + getMemUsage() + 'MB')
                            imageStore[imageStoreKey] = data
                            res.header('Content-Type', 'image/jpeg').send(data);
                        }
                    });
            })
    } else {
        console.log('Error not found: ', req.params.imageName);
        res.status(404).send('Not found');
    }
})

//
let images = {}
setInterval(async () => {
    for (let i in images) {
        // must have name.. obviously
        if (!images[i].name || !fs.existsSync('src/images/' + images[i].name)) {
            delete images[i]
            continue;
        }

        // filesize
        if (!images[i].size) {
            let { size, mtime } = fs.statSync('src/images/' + images[i].name).size
            images[i].size = size
            images[i].mtime = mtime
            changed = true
        }

        // metadata
        if (!images[i].metadata) {
            const sharpImage = sharp('src/images/' + images[i].name);
            let imageMetadata = await sharpImage.metadata()
            delete imageMetadata.exif
            delete imageMetadata.iptc
            delete imageMetadata.xmp
            images[i].metadata = imageMetadata
            changed = true
        }
    }
}, 5000)

app.get('/api/images', (req, res, next) => {
    // cache
    if (Object.keys(images).length) {
        return res.json(images)
    }
    fs.readdir('src/images', function (err, items) {
        if (err) return next(err)
        //
        let data = {}
        for (let i in items) {
            const key = hash('sha256', items[i]).toString('hex')
            const { size, mtime } = fs.statSync('src/images/' + items[i])

            data[key] = {
                name: items[i],
                size: size,
                mtime: mtime
            }
        }
        images = data
        res.json(data)
    });
})

app.listen(port, () => console.log(`Server started: http://localhost:${port}`))
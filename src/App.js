import './App.css';
import * as React from 'react'
import {useState} from 'react'
import piexif from 'piexifjs'
import {Button} from "@mui/material";
import * as Pica from 'pica'
import JSZipUtils from "jszip-utils";
import JSZip from "jszip";
import {saveAs} from 'file-saver'

function App() {

    const [uploadedFiles, setUploadedFiles] = useState([])
    const [resizedImgs, setResizedImgs] = useState([])

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files)
        files.forEach(f => {
            const name = f.name
            const reader = new FileReader()
            reader.onloadend = () => {
                const original = reader.result
                const exifObj = piexif.load(original) // get exif data from img
                const metadata = piexif.dump(exifObj) // dump as str
                setUploadedFiles(imgs => [...imgs, {name, original, metadata}])
            }
            reader.readAsDataURL(f)
        })
    }

    const processImages = () => {
        uploadedFiles.forEach(f => resizeImage(f))
    }

    const resizeImage = (image) => {
        const originalImg = new Image()
        let resizedImg
        originalImg.onload = async () => {
            const aspectRatioMultiplier = originalImg.naturalWidth / 16
            const resizedWidth = aspectRatioMultiplier * 16
            const resizedHeight = aspectRatioMultiplier * 9
            const canvas = new OffscreenCanvas(resizedWidth, resizedHeight)
            canvas.width = resizedWidth
            canvas.height = resizedHeight
            const pica = new Pica()
            resizedImg = await pica.resize(originalImg, canvas, {
                unsharpAmount: 160,
                unsharpRadius: 0.6,
                unsharpThreshold: 1
            });
            const blob = await resizedImg.convertToBlob({type: "image/jpeg"})
            setUploadedFiles(imgs => imgs.filter(i => i.name !== image.name))
            const reader = new FileReader()
            reader.onloadend = () => {
                const result = reader.result
                const enrichedImg = piexif.insert(image.metadata, result)
                setResizedImgs(imgs => [...imgs, {name: image.name, data: enrichedImg}])
            }
            reader.readAsDataURL(blob)
        }
        originalImg.src = image.original
    }

    const downloadImages = () => {
        const zip = new JSZip();
        let numImgsZipped = 0;
        const zipFilename = "resized-pics.zip";
        resizedImgs.forEach(function (img) {
            const filename = img.name;
            JSZipUtils.getBinaryContent(img.data, function (err, data) {
                if (err) throw err;
                zip.file(filename, data, { binary: true });
                numImgsZipped++;
                if (numImgsZipped === resizedImgs.length) {
                    zip.generateAsync({ type: 'blob' }).then(function (content) {
                        saveAs(content, zipFilename);
                        setResizedImgs([])
                    });
                }
            });
        });
    }

    return (
        <div className="app app-header">
            <h3>Pic Resizer</h3>
            <input
                color="primary"
                accept="image/*"
                type="file"
                multiple="multiple"
                onChange={handleFileInput}
                id="icon-button-file"
                style={{display: 'none',}}
            />
            <label htmlFor="icon-button-file">
                <Button
                    variant="contained"
                    component="span"
                    size="large"
                >Upload Files
                </Button>
            </label>
            <div className="uploaded-files-list">
                {uploadedFiles.map(f => (<div>{f.name}</div>))}
            </div>
            <Button
                variant="contained"
                component="span"
                size="large"
                onClick={processImages}
            >Process Files
            </Button>
            <div className="uploaded-files-list">
                # Resized Images: {resizedImgs.length}
            </div>
            <Button
                variant="contained"
                component="span"
                size="large"
                onClick={downloadImages}
            >Download Resized Images
            </Button>
        </div>
    )
}

export default App;

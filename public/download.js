document.getElementById("downloadButton").addEventListener("click", function () {
    const zip = new JSZip();
    zip.file("index.html", document.getElementById("html").value);
    zip.file("styles.css", document.getElementById("css").value);
    zip.file("script.js", document.getElementById("js").value);

    zip.generateAsync({ type: "blob" }).then(function (content) {
        const a = document.createElement("a");
        const url = URL.createObjectURL(content);
        a.href = url;
        a.download = "code.zip";
        a.click();
        URL.revokeObjectURL(url);
    });
});

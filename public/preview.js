document.getElementById("previewButton").addEventListener("click", function () {
    const htmlContent = document.getElementById("html").value;
    const cssContent = "<style>" + document.getElementById("css").value + "</style>";
    const jsContent = "<script>" + document.getElementById("js").value + "<\/script>";

    const previewFrame = document.getElementById("preview");
    const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;

    previewDocument.open();
    previewDocument.write(htmlContent + cssContent + jsContent);
    previewDocument.close();
});

document.getElementById("fullScreenButton").addEventListener("click", function () {
    const htmlContent = document.getElementById("html").value;
    const cssContent = "<style>" + document.getElementById("css").value + "</style>";
    const jsContent = "<script>" + document.getElementById("js").value + "<\/script>";

    const newWindow = window.open("", "_blank");
    newWindow.document.open();
    newWindow.document.write(htmlContent + cssContent + jsContent);
    newWindow.document.close();
});

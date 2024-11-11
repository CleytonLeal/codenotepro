async function saveCode() {
    const user = auth.currentUser;
    if (!user) {
        document.getElementById("loginModal").classList.remove("hidden");
        return;
    }
    const htmlContent = document.getElementById("html").value;
    const cssContent = document.getElementById("css").value;
    const jsContent = document.getElementById("js").value;

    await setDoc(doc(db, "codenotepro", user.uid), { htmlContent, cssContent, jsContent });
}

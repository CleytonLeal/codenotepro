document.getElementById("menu-toggle").addEventListener("click", function () {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.style.display = mobileMenu.style.display === "block" ? "none" : "block";
});

document.getElementById("loginButton").addEventListener("click", function () {
    document.getElementById("loginModal").classList.toggle("hidden");
});
document.getElementById("closeModal").addEventListener("click", function () {
    document.getElementById("loginModal").classList.add("hidden");
});
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("loginButton").addEventListener("click", function () {
        document.getElementById("loginModal").classList.remove("hidden");
    });
});

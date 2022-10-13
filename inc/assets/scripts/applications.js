console.log("sidebar-js");

document.addEventListener('DOMContentLoaded', () => {
    let applicationButton = document.querySelector('.applications-menu');
    let applicationMenu = document.querySelector('.applications-menu .wrapper');
    applicationButton.addEventListener('click', function () {
        applicationMenu.classList.toggle('active');
    });
});

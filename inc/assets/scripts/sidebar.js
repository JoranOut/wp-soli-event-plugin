console.log("applications-js");

let closedSidebar = window.sessionStorage.getItem("closed-sidebar") === "true";

document.addEventListener('DOMContentLoaded', () => {
    let sidebar = document.querySelector('.sidebar');
    if (closedSidebar)
        sidebar.classList.add("closed");
    let sidebarToggle = document.querySelector('.sidebar .toggle');
    sidebarToggle.addEventListener('click', function () {
        sidebar.classList.toggle('closed');
        closedSidebar = !closedSidebar;
        window.sessionStorage.setItem("closed-sidebar", closedSidebar);
    });
});

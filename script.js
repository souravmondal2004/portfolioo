var typed = new Typed(".text", {
    strings:["Frontend Devoloper","programmer","Web Developer","AI Devoloper"],
    typeSpeed:100,
    backSpeed:100,
    backDelay:1000,
    loop:true
});
let navbar = document.querySelector('.navbar');
window.onscroll = () => {
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if (top >= offset && top < offset + height) {
            navLinks.forEach(links => {
                links.classList.remove('active');
                document.querySelector('header nav a[href*=' + id + ']').classList.add('active');
            });
        }
    });
        let header = document.querySelector('header');
    header.classList.toggle('sticky', window.scrollY >100 );

    /* ========== Remove Navbar on Scroll (Mobile) ========== */
    menuIcon.classList.remove('fa-xmark');
    navbar.classList.remove('active');
};

const navLinks=document.querySelectorAll("nav-manu .nav-link");
const menuOpenButton=document.querySelector("#menu-open-button");
const menuCloseButton=document.querySelector("#menu-close-button");
menuOpenButton.addEventListener("click", () => {
    document.body.classList.toggle("show-mobile-manu");
});
// close menu when close butten is clicked
menuCloseButton.addEventListener("click", () => menuOpenButton.click());
// close menu when nav link is clicked
navLinks.forEach(link => {
  link.addEventListener("click", () => menuOpenButton.click());
});
const swiper = new Swiper('.slider-wrapper', {
  loop: true,
  spaceBetween:25,
  grabCursor:true,

  // If we need pagination
  pagination: {
    el: '.swiper-pagination',
  },

  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
//   responsive breakpoint
  breakpoints:{
    0:{
        slidesPerView:1
    },
       768:{
        slidesPerView:2
    },
   
       1024:{
        slidesPerView:3
    },
  }
});
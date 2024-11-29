document.querySelector('.side-nav-tog').addEventListener('click', () => {
    document.querySelector('.side-nav').style.right = 0
    document.querySelector('.mask').style.display = "block"
})


document.querySelector('.mask').addEventListener('click', () => {
    document.querySelector('.side-nav').style.right = "-100%"
    document.querySelector('.mask').style.display = "none"
})

document.querySelector('.side-nav-close').addEventListener('click', () => {
    document.querySelector('.side-nav').style.right = "-100%"
    document.querySelector('.mask').style.display = "none"
})
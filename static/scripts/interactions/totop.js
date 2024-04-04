var mybutton = document.getElementById("goTopBtn");

window.addEventListener('scroll', function() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
});

function goToTop() {
  document.documentElement.style.scrollBehavior = 'smooth';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

var mybutton = document.getElementById("goTopBtn-footer");

window.addEventListener('scroll', function() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
});

function goToTopfooter() {
  document.documentElement.style.scrollBehavior = 'smooth';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener("scroll", function() {
  var goTopBtn = document.getElementById("goTopBtn");
  if (window.pageYOffset > 100) {
      goTopBtn.style.display = "block";
  } else {
      goTopBtn.style.display = "none";
  }
});

window.addEventListener("scroll", function() {
  var goTopBtn = document.getElementById("goTopBtn-footer");
  if (window.pageYOffset > 100) {
      goTopBtn.style.display = "block";
  } else {
      goTopBtn.style.display = "none";
  }
});